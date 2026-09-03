// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  guidesSidebar: [
    "intro",
    "getting-started",
    {
      type: "category",
      label: "Work with data",
      items: ["models-and-collections", "querying", "writes", "validation"],
    },
    {
      type: "category",
      label: "PouchDB features",
      items: ["synchronization", "attachments-and-adapters"],
    },
    "troubleshooting",
    "security",
    "migrating-to-v5",
    "api-reference",
  ],
};

export default sidebars;
