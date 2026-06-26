import { defineConfig } from "vitepress";

export default defineConfig({
  title: "My Mind Node",
  description: "Embeddable mind map editor and viewer for React",
  base: "/my-mind/",
  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide" },
      { text: "API", link: "/reference/api" },
      { text: "Migration", link: "/reference/migration" },
    ],
    sidebar: [
      {
        text: "Start",
        items: [
          { text: "Quick Start", link: "/guide" },
          { text: "Core Concepts", link: "/guides/core-concepts" },
          { text: "React Integration", link: "/guides/react" },
          { text: "Import and Export", link: "/guides/import-export" },
          { text: "FAQ", link: "/guides/faq" },
        ],
      },
      {
        text: "Reference",
        items: [
          { text: "API", link: "/reference/api" },
          { text: "Migration", link: "/reference/migration" },
          { text: "npm Publishing", link: "/reference/npm-publishing" },
          { text: "Public Beta Report", link: "/reference/public-beta-report" },
        ],
      },
    ],
  },
});
