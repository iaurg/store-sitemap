import { Binding, TenantClient } from '@vtex/api'
import { any, startsWith } from 'ramda'
import { GENERATE_SITEMAP_EVENT, sleep } from './middlewares/generateMiddlewares/utils'

export const CONFIG_BUCKET = 'configuration'
export const CONFIG_FILE = 'config.json'
export const TOKEN_FILE = 'token.json'

export const TENANT_CACHE_TTL_S = 60 * 10

export const STORE_PRODUCT = 'vtex-storefront'

const validBinding = (path: string) => (binding: Binding) => {
  const isStoreBinding = binding.targetProduct === STORE_PRODUCT
  const matchesPath = any(startsWith(path), [
    binding.canonicalBaseAddress,
    ...binding.alternateBaseAddresses,
  ])

  return matchesPath && isStoreBinding
}

export const notFound = <T>(fallback: T) => (error: any): T => {
  if (error.response && error.response.status === 404) {
    return fallback
  }
  throw error
}

export class SitemapNotFound extends Error {}

export const SITEMAP_URL = '/sitemap/:path'

export const getMatchingBindings = async (
  path: string,
  tenant: TenantClient
) => {
  const pathWithoutWorkspace = path.replace(/^(.)+--/, '')
  const tenantInfo = await tenant.info({
    forceMaxAge: TENANT_CACHE_TTL_S,
  })
  // gets bindings that matches path
  return tenantInfo.bindings.filter(validBinding(pathWithoutWorkspace))
}

export const hashString = (str: string) => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash += (str.charCodeAt(i) * 31) ** (str.length - i)
    // tslint:disable-next-line:no-bitwise
    hash &= hash
  }
  return hash.toString()
}

export const getBucket = (prefix: string, bucketName: string) => `${prefix}_${bucketName}`

export const startSitemapGeneration = async (ctx: Context) => {
  const { clients: { vbase, events }, vtex: { logger, adminUserAuthToken } } = ctx
  if (!adminUserAuthToken) {
      ctx.status = 401
      ctx.body = 'Missing adminUserAuth token'
      logger.error(`Missing adminUserAuth token`)
      return
  }
  // TODO add querystrring force
  // Add ttl
  const token = await vbase.getJSON<string>(CONFIG_BUCKET, TOKEN_FILE, true)
  if (token) {
    ctx.status = 202
    ctx.body = 'Sitemap generation already in place'
    return
  }
  await vbase.saveJSON<string>(CONFIG_BUCKET, TOKEN_FILE, adminUserAuthToken)
  events.sendEvent('', GENERATE_SITEMAP_EVENT)
}
