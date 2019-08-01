import { AppClient, InstanceOptions, IOContext } from '@vtex/api'

import { SiteMap } from './base'

export class SitemapGC extends AppClient implements SiteMap {
  constructor(context: IOContext, options?: InstanceOptions) {
    super(`gocommerce.sitemap-app`, context, options)
  }

  public fromLegacy = (forwardedPath: string) => this.http.get(forwardedPath)

  public replaceHost = (str: string, forwardedHost: string, rootPath: string = '') => {
    const { account, workspace } = this.context
    const regex = new RegExp(`${workspace}--${account}.mygocommerce.com`, 'g')
    return str.replace(regex, `${forwardedHost}${rootPath}`)
  }

  // tslint:disable-next-line
  public appendSitemapItems = async (_currSitemap: any, _items: string[]) => {}
}