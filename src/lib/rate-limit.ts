import { createHash, timingSafeEqual } from "node:crypto";

/*
 * Per-client limits on the two endpoints that do real work on every request, /api/search and
 * /mcp. One container answers each site, so counters in memory are the whole picture. They
 * reset when the container restarts, which is fine for a limit.
 *
 * A client is the address in X-Forwarded-For. Caddy replaces that header with the address it
 * saw, since it trusts no proxy in front of it, and the container only listens on 127.0.0.1,
 * so the value can't be forged. A proxy on another host must also set the header, not append
 * to it. IPv6 clients usually hold a whole /64, so they count per /64. Without the header (a
 * local run, the CI smoke test) every request counts as one client.
 *
 * The check scripts send X-Portal-Check with the token from RATE_LIMIT_BYPASS_TOKEN, because
 * check-search alone runs thousands of searches. With the variable unset, nothing bypasses.
 */

type Limit = { burst: number; perSecond: number };

export const LIMITS = {
  search: { burst: 60, perSecond: 2 },
  mcp: { burst: 60, perSecond: 1 },
} satisfies Record<string, Limit>;

type Name = keyof typeof LIMITS;

const MAX_CLIENTS = 50_000;
const buckets = new Map<string, { tokens: number; at: number }>();

/** Takes one request from the client's allowance. Returns 0, or the seconds until the next one. */
export function rateLimit(request: Request, name: Name, now = Date.now()) {
  if (bypassed(request)) return 0;
  const { burst, perSecond } = LIMITS[name];
  const key = `${name} ${clientOf(request)}`;
  const bucket = buckets.get(key) ?? { tokens: burst, at: now };
  bucket.tokens = Math.min(burst, bucket.tokens + ((now - bucket.at) / 1000) * perSecond);
  bucket.at = now;
  buckets.set(key, bucket);
  if (buckets.size > MAX_CLIENTS) sweep(now);
  if (bucket.tokens < 1) return Math.ceil((1 - bucket.tokens) / perSecond);
  bucket.tokens -= 1;
  return 0;
}

export function clientOf(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!forwarded) return "local";
  const address = forwarded.replace(/^::ffff:(?=\d+\.\d+\.\d+\.\d+$)/i, "");
  return address.includes(":") ? `${prefix64(address)}::/64` : address;
}

/** The first four groups of an IPv6 address, with "::" expanded. */
function prefix64(address: string) {
  const width = (groups: string[]) => groups.reduce((n, group) => n + (group.includes(".") ? 2 : 1), 0);
  const [head, tail] = address.split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const groups = tail === undefined ? left : [...left, ...Array(Math.max(0, 8 - width(left) - width(right))).fill("0"), ...right];
  return groups
    .slice(0, 4)
    .map((group) => (Number.parseInt(group, 16) || 0).toString(16))
    .join(":");
}

function bypassed(request: Request) {
  const token = process.env.RATE_LIMIT_BYPASS_TOKEN;
  const offered = request.headers.get("x-portal-check");
  if (!token || !offered) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(token), digest(offered));
}

/** Forgets buckets that have refilled, which changes nothing. If that frees too little, forgets all. */
function sweep(now: number) {
  for (const [key, bucket] of buckets) {
    const { burst, perSecond } = LIMITS[key.slice(0, key.indexOf(" ")) as Name];
    if (bucket.tokens + ((now - bucket.at) / 1000) * perSecond >= burst) buckets.delete(key);
  }
  if (buckets.size > MAX_CLIENTS / 2) buckets.clear();
}
