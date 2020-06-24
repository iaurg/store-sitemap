import { Events, IOContext, Logger} from '@vtex/api'
import * as TypeMoq from 'typemoq'

import { Clients } from '../../clients'
import { generateSitemap } from './generateSitemap'
import {
  GENERATE_APPS_ROUTES_EVENT,
  GENERATE_PRODUCT_ROUTES_EVENT,
  GENERATE_REWRITER_ROUTES_EVENT
} from './utils'

const eventsTypeMock = TypeMoq.Mock.ofInstance(Events)
const contextMock = TypeMoq.Mock.ofType<EventContext>()
const ioContext = TypeMoq.Mock.ofType<IOContext>()
const state = TypeMoq.Mock.ofType<State>()
const loggerMock = TypeMoq.Mock.ofType<Logger>()

const eventSent = jest.fn()

const DEFAULT_APPS_ROUTES_PAYLOAD = {
  generationId: '1',
}

const DEFAULT_REWRITER_ROUTES_PAYLOAD = {
  count: 0,
  generationId: '1',
  next: null,
  report: {},
}

const DEFAULT_PRODUCT_ROUTES_PAYLOAD = {
  from: 0,
  generationId: '1',
  invalidProducts: 0,
  processedProducts: 0,
}

describe('Test generate sitemap', () => {
  let context: EventContext
  const events = class EventsMock extends eventsTypeMock.object {
    constructor() {
      super(ioContext.object)
    }

    public sendEvent = async (subject: string, route: string, message: any, _: any) => {
      eventSent(subject, route, message)
    }
  }

  beforeEach(() => {
    // tslint:disable-next-line:max-classes-per-file
    const ClientsImpl = class ClientsMock extends Clients {
      get events() {
        return this.getOrSet('events', events)
      }
    }

    jest.clearAllMocks()

    context = {
      body: {
        generationId: '1',
      },
      clients: new ClientsImpl({}, ioContext.object),
      ...contextMock.object,
      state: {
        ...state.object,
        settings: {
          enableAppsRoutes: true,
          enableNavigationRoutes: true,
          enableProductRoutes: true,
          isIOAccount: true,
        },
      },
      vtex: {
        ...ioContext.object,
        logger: loggerMock.object,
      },
    }
  })

  it('Should send both events', async () => {
    await generateSitemap(context)
    expect(eventSent).toHaveBeenCalledWith('', GENERATE_REWRITER_ROUTES_EVENT, DEFAULT_REWRITER_ROUTES_PAYLOAD)
    expect(eventSent).toHaveBeenCalledWith('', GENERATE_PRODUCT_ROUTES_EVENT, DEFAULT_PRODUCT_ROUTES_PAYLOAD)
    expect(eventSent).toHaveBeenCalledWith('', GENERATE_APPS_ROUTES_EVENT, DEFAULT_APPS_ROUTES_PAYLOAD)
  })

  it('Should send only enabled events', async () => {
    context.state.settings = {
      enableAppsRoutes: true,
      enableNavigationRoutes: true,
      enableProductRoutes: false,
      isIOAccount: true,
    }

    await generateSitemap(context)
    expect(eventSent).toHaveBeenCalledWith('', GENERATE_REWRITER_ROUTES_EVENT, DEFAULT_REWRITER_ROUTES_PAYLOAD)
    expect(eventSent).toHaveBeenCalledWith('', GENERATE_APPS_ROUTES_EVENT, DEFAULT_APPS_ROUTES_PAYLOAD)
    expect(eventSent).toHaveBeenCalledTimes(2)

    jest.clearAllMocks()
    context.state.settings = {
      enableAppsRoutes: false,
      enableNavigationRoutes: false,
      enableProductRoutes: true,
      isIOAccount: true,
    }

    await generateSitemap(context)
    expect(eventSent).toHaveBeenCalledWith('', GENERATE_PRODUCT_ROUTES_EVENT, DEFAULT_PRODUCT_ROUTES_PAYLOAD)
    expect(eventSent).toHaveBeenCalledTimes(1)
  })
})
