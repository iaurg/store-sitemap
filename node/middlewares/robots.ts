import { Context } from '../utils/helpers'

export const robots = async (ctx: Context) => {
  const {dataSources: {robots: robotsDataSource}} = ctx
  const {data} = await robotsDataSource.fromLegacy()
  ctx.set('Content-Type', 'text/plain')
  ctx.body = data
}
