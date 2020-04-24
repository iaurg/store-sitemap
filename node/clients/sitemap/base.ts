export interface SiteMap {
  fromLegacy: (forwardedPath: string) => Promise<string>

  replaceHost: (str: string, forwardedHost: string, rootPath?: string) => string

  appendSitemapItems: (currSitemap: any, items: string[]) => void
}