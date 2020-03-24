import * as cheerio from 'cheerio'
import { forEach, map, values } from 'ramda'

import { currentDate } from '../resources/utils'

const TEN_MINUTES_S = 10 * 60

export async function userSitemap(ctx: Context) {
  const {
    clients: { routes },
    vtex: { production },
  } = ctx
  const userRoutes = await routes.userRoutes().catch(() => null)
  const forwardedHost = ctx.get('x-forwarded-host')
  let rootPath = ctx.get('x-vtex-root-path')
  // Defend against malformed root path. It should always start with `/`.
  if (rootPath && !rootPath.startsWith('/')) {
    rootPath = `/${rootPath}`
  }
  const $ = cheerio.load(
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
    {
      decodeEntities: false,
      xmlMode: true,
    }
  )

  if (userRoutes?.['vtex.admin-pages']) {
    const xmlUserRoutes = map(
      (route: any) =>
        `<url>
        <loc>https://${forwardedHost}${rootPath}${route.path}</loc>
        <lastmod>${currentDate()}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.4</priority>
      </url>`,
      values(userRoutes['vtex.admin-pages'])
    )
    forEach((userRoute: string) => $('urlset').append(userRoute), xmlUserRoutes)
  }

  ctx.set('Content-Type', 'text/xml')
  ctx.body = $.xml()
  ctx.status = 200
  ctx.set(
    'cache-control',
    production ? `public, max-age=${TEN_MINUTES_S}` : 'no-cache'
  )
}
