import { Tenant, VBase } from '@vtex/api'
import { Product, SalesChannel } from 'vtex.catalog-graphql'

import { Messages } from '../../clients/messages'
import { CONFIG_BUCKET, CONFIG_FILE, getBucket, hashString, TENANT_CACHE_TTL_S } from '../../utils'

export const REWRITER_ROUTES_INDEX = 'rewriterRoutesIndex.json'
export const PRODUCT_ROUTES_INDEX = 'productRoutesIndex.json'

export const GENERATE_SITEMAP_EVENT = 'sitemap.generate'
export const GENERATE_REWRITER_ROUTES_EVENT = 'sitemap.generate:rewriter-routes'
export const GENERATE_PRODUCT_ROUTES_EVENT = 'sitemap.generate:product-routes'
const FILE_LIMIT = 30000

export const DEFAULT_CONFIG: Config = {
  generationPrefix: 'B',
  productionPrefix: 'A',
}

export interface SitemapIndex {
  index: string[]
  lastUpdated: string
}

export interface SitemapEntry {
  routes: Route[]
  lastUpdated: string
}

export interface Message {
  content: string
  context: string
}

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const currentDate = (): string => new Date().toISOString()


export const initializeSitemap = async (ctx: EventContext, indexFile: string) => {
  const { tenant, vbase } = ctx.clients
  const { bindings } = await tenant.info({
    forceMaxAge: TENANT_CACHE_TTL_S,
  })

  const config = await vbase.getJSON<Config>(CONFIG_BUCKET, CONFIG_FILE, true) || DEFAULT_CONFIG
  await Promise.all(bindings.map(
    binding => {
      ctx.body.entityCountByBinding[binding.id] = {}
      return vbase.saveJSON<SitemapIndex>(getBucket(config.generationPrefix, hashString(binding.id)), indexFile, {
        index: [] as string[],
        lastUpdated: '',
      })
    }
  ))
}


export const filterBindingsBySalesChannel = (
  tenantInfo: Tenant,
  salesChannels: Product['salesChannel']
): Tenant['bindings'] => {
  const salesChannelsSet = salesChannels?.reduce((acc: Set<string>, sc: Maybe<SalesChannel>) => {
    if (sc?.id) {
      acc.add(sc.id)
    }
    return acc
  }, new Set<string>())

  return tenantInfo.bindings.filter(binding => {
    if (binding.targetProduct === 'vtex-storefront') {
      const bindingSC: number | undefined =
        binding.extraContext.portal?.salesChannel
      const productActiveInBindingSC =
        bindingSC && salesChannelsSet?.has(bindingSC.toString())
      if (productActiveInBindingSC || !salesChannelsSet) {
        return true
      }
    }
    return false
  })
}

export const slugify = (str: string) =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[*+~.()'"!:@&\[\]`,/ %$#?{}|><=_^]/g, '-')

export const createTranslator = (service: Messages) => async (
  from: string,
  to: string,
  messages: Message[]
): Promise<string[]> => {
  if (from.toLowerCase() === to.toLowerCase()) {
    return messages.map(({ content }) => content)
  }
  const translations = await service.translateNoCache({
    indexedByFrom: [
      {
        from,
        messages,
      },
    ],
    to,
  })
  return translations
}

const getEntry = (entity: string, count: number) => `${entity}-${count}`

export const createDataSaver = (vbase: VBase, bucket: string) =>
  async (entity: string, count: number, routes: Route[], lastUpdated: string) => {
    const currentEntry = getEntry(entity, count)
    const { routes: savedRoutes } = await vbase.getJSON<SitemapEntry>(bucket, currentEntry, true) || { routes: [] }
    const shouldUpdateIndex = savedRoutes.length === 0 || savedRoutes.length + routes.length > FILE_LIMIT

    if (shouldUpdateIndex) {
      const newCount = count + 1
      const newEntry = getEntry(entity, newCount)

      await vbase.saveJSON<SitemapEntry>(bucket, newEntry, {
        lastUpdated,
        routes,
      })

      return  {
        count: newCount,
        entry: newEntry,
      }
    } else {
      const updatedRoutes = [...savedRoutes, ...routes]
      await vbase.saveJSON<SitemapEntry>(bucket, currentEntry, {
        lastUpdated,
        routes: updatedRoutes,
      })
      return
    }
  }
