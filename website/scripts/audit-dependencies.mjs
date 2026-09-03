import { spawnSync } from "node:child_process";

const acceptedAdvisories = new Set([
  "https://github.com/advisories/GHSA-5p2g-fcmc-qvqq",
  "https://github.com/advisories/GHSA-w3rx-r6r6-pgpr",
]);

const audit = spawnSync("npm", ["audit", "--json"], {
  encoding: "utf8",
  shell: false,
});

if (audit.error || audit.status === null || audit.status > 1 || !audit.stdout) {
  console.error("Unable to audit the documentation dependencies.");
  if (audit.error) console.error(audit.error.message);
  process.exit(1);
}

let report;
try {
  report = JSON.parse(audit.stdout);
} catch {
  console.error("npm audit did not return valid JSON.");
  process.exit(1);
}

if (report.error || !report.metadata?.vulnerabilities) {
  console.error("npm audit did not return a vulnerability report.");
  process.exit(1);
}

const advisories = new Set();
for (const vulnerability of Object.values(report.vulnerabilities || {})) {
  for (const cause of vulnerability.via || []) {
    if (typeof cause === "object" && cause.url) advisories.add(cause.url);
  }
}

const unexpected = [...advisories].filter(
  (advisory) => !acceptedAdvisories.has(advisory),
);

if (unexpected.length > 0) {
  console.error(
    "The documentation dependency audit found unreviewed advisories:",
  );
  unexpected.forEach((advisory) => console.error(`- ${advisory}`));
  process.exit(1);
}

console.log(
  `Dependency audit passed with ${advisories.size} reviewed image parser advisories.`,
);
