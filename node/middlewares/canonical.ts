import { Context, Middleware } from '../utils/helpers'

const getCanonical: Middleware = async (ctx: Context) => {
  const {dataSources: {canonicals}, query: {canonicalPath}} = ctx
  const maybeRoute = await canonicals.load(canonicalPath)
  ctx.body = maybeRoute
  ctx.status = maybeRoute ? 200 : 204
  ctx.set('content-type', 'application/json')
}

const saveCanonical: Middleware = async (ctx: Context) => {
  const {dataSources: {canonicals}, body: entry} = ctx
  await canonicals.save(entry)
  ctx.status = 204
}

const router: Record<string, Middleware> = {
  GET: getCanonical,
  PUT: saveCanonical,
}

export const canonical: Middleware = async (ctx: Context) => {
  const middleware = router[ctx.method.toUpperCase()]
  return middleware && middleware(ctx)
}
