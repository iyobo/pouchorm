// @ts-check

import { themes as prismThemes } from "prism-react-renderer";

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "PouchORM",
  tagline: "Typed collections and model helpers for PouchDB.",
  favicon: "img/favicon.svg",
  url: "https://iyobo.github.io",
  baseUrl: "/pouchorm/",
  organizationName: "iyobo",
  projectName: "pouchorm",
  onBrokenLinks: "throw",
  trailingSlash: false,
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: "throw",
    },
  },
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },
  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          path: "../docs",
          routeBasePath: "docs",
          sidebarPath: "./sidebars.js",
          editUrl: ({ version, docPath }) => {
            const source =
              version === "current"
                ? `docs/${docPath}`
                : `website/versioned_docs/version-${version}/${docPath}`;
            return `https://github.com/iyobo/pouchorm/edit/master/${source}`;
          },
          showLastUpdateAuthor: true,
          showLastUpdateTime: true,
          lastVersion: "current",
          versions: {
            current: {
              label: "5.x",
              path: "",
              banner: "none",
            },
            "4.x": {
              label: "4.x",
              path: "4.x",
              banner: "unmaintained",
            },
          },
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      }),
    ],
  ],
  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: "PouchORM",
        logo: {
          alt: "PouchORM",
          src: "img/logo.svg",
        },
        items: [
          {
            type: "docSidebar",
            sidebarId: "guidesSidebar",
            position: "left",
            label: "Guides",
          },
          {
            type: "doc",
            docId: "api-reference",
            label: "API reference",
            position: "left",
          },
          {
            type: "docsVersionDropdown",
            position: "right",
          },
          {
            href: "https://github.com/iyobo/pouchorm",
            label: "GitHub",
            position: "right",
          },
        ],
      },
      footer: {
        style: "dark",
        links: [
          {
            title: "Documentation",
            items: [
              { label: "Get started", to: "/docs/getting-started" },
              { label: "Query documents", to: "/docs/querying" },
              { label: "Synchronize databases", to: "/docs/synchronization" },
              { label: "API reference", to: "/docs/api-reference" },
            ],
          },
          {
            title: "Project",
            items: [
              {
                label: "GitHub",
                href: "https://github.com/iyobo/pouchorm",
              },
              {
                label: "npm",
                href: "https://www.npmjs.com/package/pouchorm",
              },
              {
                label: "Issues",
                href: "https://github.com/iyobo/pouchorm/issues",
              },
              {
                label: "Security policy",
                href: "https://github.com/iyobo/pouchorm/security/policy",
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} PouchORM contributors. Released under the MIT License.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ["bash"],
      },
    }),
};

export default config;
