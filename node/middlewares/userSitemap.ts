import * as cheerio from 'cheerio'
import { forEach, map, values } from 'ramda'

import { getCurrentDate } from '../resources/utils'
import { Context, Middleware } from '../utils/helpers'

export const userSitemap: Middleware = async (ctx: Context) => {
  const {dataSources: {routes}} = ctx
  const userRoutes = await routes.userRoutes().catch(() => null)
  const forwardedHost = ctx.get('x-forwarded-host')
  const $ = cheerio.load('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>', {
    decodeEntities: false,
    xmlMode: true,
  })

  if (userRoutes && userRoutes['vtex.admin-pages']) {
    const xmlUserRoutes = map((route: any) =>
      `<url>
        <loc>https://${forwardedHost}${route.path}</loc>
        <lastmod>${getCurrentDate()}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.4</priority>
      </url>`, values(userRoutes['vtex.admin-pages']))
    forEach((userRoute: string) => $('urlset').append(userRoute), xmlUserRoutes)
  }

  ctx.set('Content-Type', 'text/xml')
  ctx.body = $.xml()
}
