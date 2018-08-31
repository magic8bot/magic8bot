import { BaseRouter } from '../base.router'

export class StrategyRouter extends BaseRouter {
  public static path = '/strategy'
  private static instance: StrategyRouter = null

  public static get router() {
    if (!StrategyRouter.instance) StrategyRouter.instance = new StrategyRouter()

    return StrategyRouter.instance.router
  }

  private constructor() {
    super()

    this.router.get('/', (req, res) => {
      //
    })
  }
}
