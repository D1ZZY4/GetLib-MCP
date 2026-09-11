export interface LibraryEntry {
  id: string;
  name: string;
  aliases: string[];
  description: string;
  docsUrl: string;
  llmsTxtUrl?: string;
  llmsFullTxtUrl?: string;
  githubUrl?: string;
  npmPackage?: string;
  pypiPackage?: string;
  language: string[];
  tags: string[];
  bestPracticesPaths?: string[];
  urlPatterns?: string[];
}

export interface LibraryMatch {
  id: string;
  name: string;
  description: string;
  docsUrl: string;
  llmsTxtUrl: string | undefined;
  llmsFullTxtUrl?: string;
  githubUrl: string | undefined;
  score: number;
  source: "registry" | "npm" | "pypi" | "github" | "crates" | "go";
}

export interface DocResult {
  content: string;
  sourceUrl: string;
  sourceType: "llms-txt" | "llms-full-txt" | "jina" | "github-readme" | "direct" | "npm" | "deep-fetch";
  libraryId: string;
  topic: string;
  truncated: boolean;
  cachedAt: string;
}

export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export interface FetchResult {
  content: string;
  url: string;
  sourceType: DocResult["sourceType"] | "deep-fetch";
  contentHash?: string;
  fetchedAt?: string;
}

export interface Snippet {
  id: string;
  library: string;
  version?: string;
  title: string;
  description: string;
  code: string;
  language: string;
  source: string;
  score: number;
}

export interface SnippetIndex {
  library: string;
  version: string | null;
  sourceUrl: string;
  snippets: Snippet[];
  builtAt: string;
}
