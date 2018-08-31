import { BaseRouter } from './base.router'

import { BotRouter } from './bot'
import { ExchangeRouter } from './exchange'
import { StrategyRouter } from './strategy'

export class ApiRouter extends BaseRouter {
  public static path = '/api'
  private static instance: ApiRouter = null

  public static get router() {
    if (!ApiRouter.instance) ApiRouter.instance = new ApiRouter()

    return ApiRouter.instance.router
  }

  private constructor() {
    super()

    this.router.use(BotRouter.path, BotRouter.router)
    this.router.use(ExchangeRouter.path, ExchangeRouter.router)
    this.router.use(StrategyRouter.path, StrategyRouter.router)
  }
}
