import type { MockDiscoverLibrary } from "../../../types/library";

export const mockDiscoverLibraries: MockDiscoverLibrary[] = [
  {
    id: "react",
    name: "react",
    description: "Component-based UI library for building interactive web interfaces.",
    latestVersion: "19.2.0",
    weeklyDownloads: "28.4M",
    tags: ["ui", "frontend"],
  },
  {
    id: "tailwindcss",
    name: "tailwindcss",
    description: "Utility-first CSS framework for rapidly building custom designs.",
    latestVersion: "4.1.13",
    weeklyDownloads: "9.1M",
    tags: ["css", "styling"],
  },
  {
    id: "supabase-js",
    name: "@supabase/supabase-js",
    description: "Isomorphic client for Supabase auth, database, and realtime.",
    latestVersion: "2.57.4",
    weeklyDownloads: "1.8M",
    tags: ["backend", "database"],
  },
  {
    id: "mcp-sdk",
    name: "@modelcontextprotocol/sdk",
    description: "Official SDK for building MCP servers and clients with tools.",
    latestVersion: "1.17.5",
    weeklyDownloads: "640K",
    tags: ["mcp", "ai"],
  },
  {
    id: "heroui-react",
    name: "@heroui/react",
    description: "Accessible React component library built on React Aria.",
    latestVersion: "3.2.4",
    weeklyDownloads: "210K",
    tags: ["ui", "components"],
  },
  {
    id: "vite",
    name: "vite",
    description: "Fast frontend build tool with instant dev server and HMR.",
    latestVersion: "8.2.2",
    weeklyDownloads: "12.6M",
    tags: ["build", "tooling"],
  },
];
