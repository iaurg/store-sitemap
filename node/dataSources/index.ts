import { DataSources as IODataSources, Logger } from '@vtex/api'
import { DataSource } from 'apollo-datasource'
import { InMemoryLRUCache } from 'apollo-server-caching'
import { forEachObjIndexed } from 'ramda'

import { Context } from '../utils/helpers'
import { Canonicals } from './canonicals'
import { Robots } from './robots'
import { SiteMap } from './sitemap'

const TEN_SECONDS_MS = 10 * 1000
const THREE_SECONDS_MS = 10 * 1000

export interface DataSources extends IODataSources {
  canonicals: Canonicals,
  logger: Logger,
  sitemap: SiteMap,
  robots: Robots,
}

export const dataSources = (): DataSources => ({
  canonicals: new Canonicals(undefined, {timeout: TEN_SECONDS_MS}),
  logger: new Logger(undefined, {timeout: THREE_SECONDS_MS}),
  robots: new Robots(),
  sitemap: new SiteMap(),
})

const cache = new InMemoryLRUCache({
  maxSize: 100,
})

export const initialize = (context: Context) => forEachObjIndexed(
  (dataSource: DataSource) => dataSource && dataSource.initialize && dataSource.initialize({context, cache}),
  context.dataSources
)
