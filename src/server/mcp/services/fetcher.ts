/**
 * Public surface of the fetch layer.
 *
 * The implementation lives in focused modules (http/*, content-guards, doc-fetch,
 * github, packages, sitemap, llms-index). This barrel is the single import path
 * every tool and test uses, so internals can be reorganised without touching
 * ~30 call sites or their mocks.
 */
export { fetchWithTimeout, githubAuthHeaders, hashContent } from "./http/request";
export { fetchViaJina } from "./http/jina";
export { fetchAsMarkdownRace } from "./http/markdown";
export {
  isHtmlBlob,
  isErrorPage,
  isLoginWall,
  isCloudflareChallenge,
  isRateLimitPage,
  isMarketingPage,
  isEmptySPAShell,
  isGarbageContent,
} from "./content-guards";
export { isIndexContent, rankIndexLinks } from "./llms-index";
export { fetchDocs } from "./doc-fetch";
export { fetchGitHubContent, fetchGitHubReleases, fetchGitHubExamples } from "./github";
export { fetchNpmPackage, fetchPypiPackage, fetchDevDocs } from "./packages";
export { fetchSitemapUrls } from "./sitemap";
