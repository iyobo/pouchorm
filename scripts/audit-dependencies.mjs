import { spawnSync } from "node:child_process";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const allowedAdvisories = new Set([
  "https://github.com/advisories/GHSA-w5hq-g745-h8pq",
]);
const result = spawnSync(npm, ["audit", "--json"], {
  encoding: "utf8",
  maxBuffer: 10 * 1024 * 1024,
});

if (!result.stdout) {
  throw new Error(`npm audit did not return JSON: ${result.stderr.trim()}`);
}

const report = JSON.parse(result.stdout);
const vulnerabilities = report.vulnerabilities ?? {};

const advisoryUrlsFor = (packageName, visited = new Set()) => {
  if (visited.has(packageName)) return new Set();
  visited.add(packageName);

  const vulnerability = vulnerabilities[packageName];
  if (!vulnerability) return new Set();

  const urls = new Set();
  for (const cause of vulnerability.via ?? []) {
    if (typeof cause === "string") {
      advisoryUrlsFor(cause, visited).forEach((url) => urls.add(url));
    } else if (cause.url) {
      urls.add(cause.url);
    }
  }
  return urls;
};

const unexpected = [];
for (const packageName of Object.keys(vulnerabilities)) {
  const urls = advisoryUrlsFor(packageName);
  if (urls.size === 0 || [...urls].some((url) => !allowedAdvisories.has(url))) {
    unexpected.push({ packageName, urls: [...urls] });
  }
}

if (unexpected.length > 0) {
  console.error(
    "npm audit found vulnerabilities outside the reviewed allowlist:",
  );
  unexpected.forEach(({ packageName, urls }) => {
    console.error(`- ${packageName}: ${urls.join(", ") || "unknown advisory"}`);
  });
  process.exitCode = 1;
} else if (Object.keys(vulnerabilities).length > 0) {
  console.log(
    `npm audit found ${Object.keys(vulnerabilities).length} packages associated with the reviewed UUID advisory documented in SECURITY.md.`,
  );
} else {
  console.log("npm audit found no vulnerabilities.");
}
