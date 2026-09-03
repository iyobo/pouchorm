import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(siteRoot, "..");
const currentDocs = join(repositoryRoot, "docs");
const versionedDocs = join(siteRoot, "versioned_docs");

async function markdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await markdownFiles(entryPath)));
    else if (/\.mdx?$/.test(entry.name)) files.push(entryPath);
  }

  return files;
}

const files = [
  ...(await markdownFiles(currentDocs)),
  ...(await markdownFiles(versionedDocs)),
];
const forbiddenPhrases = [
  /live, retrying, bidirectional synchronization/i,
  /realtime sync!/i,
  /ready to start CRUDing/i,
];

for (const file of files) {
  const contents = await readFile(file, "utf8");
  for (const phrase of forbiddenPhrases) {
    if (phrase.test(contents)) {
      throw new Error(
        `Documentation uses disallowed wording in ${relative(repositoryRoot, file)}: ${phrase}`,
      );
    }
  }
}

const packagedMigration = (
  await readFile(join(repositoryRoot, "MIGRATING_TO_V5.md"), "utf8")
).trim();
const siteMigration = (
  await readFile(join(currentDocs, "migrating-to-v5.md"), "utf8")
)
  .replace(/^---\n[\s\S]*?\n---\n+/, "")
  .trim();

if (packagedMigration !== siteMigration) {
  throw new Error(
    "docs/migrating-to-v5.md must match MIGRATING_TO_V5.md after its front matter.",
  );
}

console.log(`Checked ${files.length} documentation pages.`);
