import * as cheerio from 'cheerio'
import { retry } from '../resources/retry'
import { isCanonical, Route } from '../resources/route'
import { getCurrentDate } from '../resources/utils'
import { Context } from '../utils/helpers'

const xmlSitemapItem = (loc: string) => {
  return `
  <sitemap>
    <loc>${loc}</loc>
    <lastmod>${getCurrentDate()}</lastmod>
  </sitemap>`
}

export const sitemap = async (ctx: Context) => {
  const {vtex: {account}, dataSources: {sitemap: sitemapDataSource, canonicals}} = ctx
  const forwardedHost = ctx.get('x-forwarded-host')
  const {data: originalXML} = await sitemapDataSource.fromLegacy()
  const normalizedXML = originalXML.replace(new RegExp(`${account}.vtexcommercestable.com.br`, 'g'), forwardedHost)
  const $ = cheerio.load(normalizedXML, {
    decodeEntities: false,
    xmlMode: true,
  })
  if (ctx.url === '/sitemap.xml') {
    $('sitemapindex').append(
      xmlSitemapItem(`https://${forwardedHost}/sitemap-custom.xml`),
      xmlSitemapItem(`https://${forwardedHost}/sitemap-user-routes.xml`)
    )
  }

  const routeList: Route[] = []
  const canonical = isCanonical(ctx)
  $('loc').each((_, loc) => {
    const canonicalUrl = $(loc).text()
    if (canonical) {
      routeList.push(new Route(ctx, canonicalUrl))
    }
  })

  forEach(canonicals.save, routeList)

  ctx.set('Content-Type', 'text/xml')
  ctx.body = $.xml()
}
