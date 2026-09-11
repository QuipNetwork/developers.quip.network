/*
 * Fetch the XQuad mdBook and unpack it into the built site at /docs/xquad/.
 *
 * The book is built by the xquad project, not this one. Rather than vendor 125
 * generated files, the portal pulls the `docs:build` artifact of xquad's latest
 * successful `main` pipeline at build time, and xquad fires a Netlify build hook
 * on push so the copy here stays current without a manual step (QUI-1331).
 *
 * No token: xquad is a public project with public jobs, so the artifact endpoint
 * is readable unauthenticated. Nothing secret belongs in this build.
 *
 * Runs as `postbuild`, writing into dist/ rather than public/, because
 * scripts/sync-docs.mjs does `rm -rf public/docs` and would delete the book on the
 * next docs:sync.
 *
 * Fails closed on a missing, truncated or broken artifact: shipping a docs section
 * that silently 404s is worse than a red build. It deliberately does NOT assert
 * that the artifact matches xquad's current main SHA -- a book one pipeline behind
 * self-heals on the next push and must not block unrelated portal deploys.
 */
import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const PROJECT_ID = "80173065"; // gitlab.com/quip.network/xquad
const REF = "main";
const JOB = "docs:build";
const ARTIFACT_URL = `https://gitlab.com/api/v4/projects/${PROJECT_ID}/jobs/artifacts/${REF}/download?job=${encodeURIComponent(JOB)}`;
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

async function download() {
  let lastError;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(ARTIFACT_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!response.ok) throw new Error(`HTTP ${response.status} from ${ARTIFACT_URL}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length === 0) throw new Error("artifact is empty");
      return bytes;
    } catch (error) {
      lastError = error;
      if (attempt < ATTEMPTS) {
        const backoff = attempt * 2000;
        console.warn(`fetch-book: attempt ${attempt} failed (${error.message}); retrying in ${backoff}ms`);
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }
  }
  fail(`could not download the ${JOB} artifact after ${ATTEMPTS} attempts: ${lastError?.message}`);
}

try {
  execFileSync("unzip", ["-v"], { stdio: "ignore" });
} catch {
  fail("`unzip` is not available; it is required to expand the artifact.");
}

const bytes = await download();
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
  console.log(`fetch-book: unpacked ${files.length} files (${pages.length} pages) into dist/docs/xquad/.`);
} finally {
  await rm(staging, { recursive: true, force: true });
}
