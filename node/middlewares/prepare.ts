import { parse } from 'query-string'

import { BindingResolver } from '../resources/bindings'
import { getMatchingBindings, hashString } from '../utils'
import { GENERATE_SITEMAP_EVENT } from './generateSitemap'

const ONE_DAY_S = 24 * 60 * 60
export async function prepare(ctx: Context, next: () => Promise<void>) {
  const {
    vtex: { production },
    clients: { events, tenant },
  } = ctx
  const forwardedHost = ctx.get('x-forwarded-host')
  let rootPath = ctx.get('x-vtex-root-path')
  // Defend against malformed root path. It should always start with `/`.
  if (rootPath && !rootPath.startsWith('/')) {
    rootPath = `/${rootPath}`
  }
  const [forwardedPath, queryString] = ctx.get('x-forwarded-path').split('?')
  const matchingBindings = await getMatchingBindings(forwardedHost, tenant)
  const bindingResolver = new BindingResolver()
  const binding = await bindingResolver.discover(ctx)
  if (!binding) {
    throw new Error(`Binding from context not found`)
  }

  const query = parse(queryString)

  const bucket = `${hashString(binding.id)}`

  ctx.state = {
    ...ctx.state,
    binding,
    bindingAddress: query.__bindingAddress as string | undefined,
    bucket,
    forwardedHost,
    forwardedPath,
    matchingBindings,
    rootPath,
  }

  await next()

  ctx.set('Content-Type', 'text/xml')
  ctx.status = 200
  ctx.set(
    'cache-control',
    production ? `public, max-age=${ONE_DAY_S}` : 'no-cache'
  )
  if (production) {
    events.sendEvent('', GENERATE_SITEMAP_EVENT)
  }
}