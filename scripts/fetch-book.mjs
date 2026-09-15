/*
 * Fetch the XQuad mdBook and unpack it into the built site at /docs/xquad/.
 *
 * The book is built by the xquad project, not this one. Rather than vendor 125
 * generated files, the portal pulls xquad's `docs:build` artifact at build time, and
 * xquad fires a Netlify build hook on push so the copy here stays current without a
 * manual step (QUI-1331).
 *
 * Which build it pulls is the subtle part, and getting it wrong is not obvious from
 * the outside -- the site looks fine, it is just one merge out of date. See
 * resolveArtifact.
 *
 * No token: xquad is a public project with public jobs, so every endpoint used here is
 * readable unauthenticated. Nothing secret belongs in this build.
 *
 * Runs as `postbuild`, writing into dist/ rather than public/, because
 * scripts/sync-docs.mjs does `rm -rf public/docs` and would delete the book on the
 * next docs:sync.
 *
 * Fails closed on a missing, truncated, broken or wrong-branch artifact: shipping a
 * docs section that silently 404s, or one built from someone's branch, is worse than a
 * red build.
 */
import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const PROJECT_ID = "80173065"; // gitlab.com/quip.network/xquad
const API = `https://gitlab.com/api/v4/projects/${PROJECT_ID}`;
const REF = "main";
const JOB = "docs:build";
/* Latest *successful* pipeline on the ref. Correct only when no pipeline is named -- see
 * resolveArtifact. */
const BY_REF_URL = `${API}/jobs/artifacts/${REF}/download?job=${encodeURIComponent(JOB)}`;
/* The artifact preserves the xquad build path; this is the directory inside it. */
const ARTIFACT_PREFIX = "docs/book/build";
const DESTINATION = path.resolve(import.meta.dirname, "../dist/docs/xquad");

/* The book has 90 HTML files today. A floor well below that catches a truncated or
 * wrong artifact without going red every time a page is added or removed. */
const PAGE_FLOOR = 80;
const ATTEMPTS = 3;
const TIMEOUT_MS = 60_000;

const fail = (message) => {
  console.error(`fetch-book: ${message}`);
  process.exit(1);
};

class HttpError extends Error {
  constructor(status, url) {
    super(`HTTP ${status} from ${url}`);
    /* A 4xx is an answer, not a hiccup -- a pipeline id that is not there now will not be
     * there in two seconds, and retrying only delays a build that is going to fail. 429 is
     * the one 4xx worth waiting out. */
    this.retryable = status === 429 || status >= 500;
  }
}

/* Anything without an explicit verdict is a transport failure (DNS, reset, timeout) and is
 * worth another go. */
async function withRetries(label, run) {
  let lastError;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (error.retryable === false) break;
      if (attempt < ATTEMPTS) {
        const backoff = attempt * 2000;
        console.warn(`fetch-book: ${label} attempt ${attempt} failed (${error.message}); retrying in ${backoff}ms`);
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }
  }
  fail(`could not ${label}: ${lastError?.message}`);
}

async function getJson(url) {
  return withRetries(`read ${url}`, async () => {
    const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) throw new HttpError(response.status, url);
    return response.json();
  });
}

/*
 * Which build of the book to fetch.
 *
 * xquad's docs:publish fires the Netlify build hook with `pipeline_id=<id>` in the POST
 * body, and Netlify hands that to this build as INCOMING_HOOK_BODY. Resolving docs:build
 * inside that named pipeline is the only correct answer: the hook fires from a job that is
 * still running, so BY_REF_URL -- the latest *successful* pipeline -- cannot yet be the
 * pipeline that triggered us and would serve the previous merge's book instead. Measured on
 * the 2026-09-11 rollout, the pipeline reached success 83s after docs:publish finished,
 * which is wider than the time this build takes to get here, so that is the normal case
 * rather than a rare race. docs:build is guaranteed complete by docs:publish's `needs:`.
 *
 * With no body -- a git push, or a manual "Trigger deploy" -- there is no pipeline to name
 * and the latest successful one is exactly right.
 */
async function resolveArtifact() {
  const body = process.env.INCOMING_HOOK_BODY ?? "";
  const pipelineId = new URLSearchParams(body).get("pipeline_id");
  if (!pipelineId) return { url: BY_REF_URL, source: `latest successful ${REF} pipeline` };
  if (!/^\d+$/.test(pipelineId)) {
    fail(`the build hook sent pipeline_id="${pipelineId}", which is not a pipeline id.`);
  }

  /* The hook URL is a secret, but a book built from some other branch must never reach the
   * host that owns the docs canonical. This also catches a future xquad change that lets
   * docs:publish run on merge-request pipelines. */
  const pipeline = await getJson(`${API}/pipelines/${pipelineId}`);
  if (pipeline.ref !== REF) {
    fail(`pipeline ${pipelineId} is for ref "${pipeline.ref}", not "${REF}". Refusing to publish it.`);
  }

  const jobs = await getJson(`${API}/pipelines/${pipelineId}/jobs?scope[]=success&per_page=100`);
  const job = jobs.find((candidate) => candidate.name === JOB);
  if (!job) {
    fail(`pipeline ${pipelineId} has no successful "${JOB}" job, so there is no book to publish.`);
  }
  return { url: `${API}/jobs/${job.id}/artifacts`, source: `pipeline ${pipelineId}, job ${job.id}` };
}

async function download(url) {
  return withRetries("download the artifact", async () => {
    const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) throw new HttpError(response.status, url);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length === 0) throw new Error("artifact is empty");
    return bytes;
  });
}

try {
  execFileSync("unzip", ["-v"], { stdio: "ignore" });
} catch {
  fail("`unzip` is not available; it is required to expand the artifact.");
}

const artifact = await resolveArtifact();
console.log(`fetch-book: taking the book from ${artifact.source}.`);
const bytes = await download(artifact.url);
const staging = await mkdtemp(path.join(os.tmpdir(), "quip-xquad-book-"));
try {
  const archive = path.join(staging, "artifact.zip");
  await writeFile(archive, bytes);
  execFileSync("unzip", ["-q", archive, "-d", staging], { stdio: "inherit" });

  const book = path.join(staging, ARTIFACT_PREFIX);
  const entries = await readdir(book, { recursive: true, withFileTypes: true }).catch(() =>
    fail(`the artifact does not contain ${ARTIFACT_PREFIX}/ -- has the xquad build layout changed?`),
  );
  const files = entries.filter((entry) => entry.isFile());
  const pages = files.filter((entry) => entry.name.endsWith(".html"));
  if (pages.length < PAGE_FLOOR) {
    fail(`only ${pages.length} HTML pages in the artifact, expected at least ${PAGE_FLOOR}.`);
  }

  const index = await readFile(path.join(book, "index.html"), "utf8").catch(() =>
    fail("the artifact has no index.html; /docs/xquad/ would 404."),
  );
  /* The QUI-988 pre-launch gate lives in the book's own theme. Assert it survived the
   * move rather than trusting it: losing it here would publish 87 pages to the host
   * that owns the docs canonical. Deleting it is the QUI-988 launch flip, and this
   * check is what makes that a deliberate change to both repos rather than an accident. */
  if (!/<meta\s+name="robots"\s+content="noindex, nofollow">/.test(index)) {
    fail("the book is no longer noindex; QUI-988's gate must be lifted deliberately, not here.");
  }

  await rm(DESTINATION, { recursive: true, force: true });
  await mkdir(path.dirname(DESTINATION), { recursive: true });
  await cp(book, DESTINATION, { recursive: true });
  console.log(
    `fetch-book: unpacked ${files.length} files (${pages.length} pages) from ${artifact.source} ` +
      `into dist/docs/xquad/.`,
  );
} finally {
  await rm(staging, { recursive: true, force: true });
}
