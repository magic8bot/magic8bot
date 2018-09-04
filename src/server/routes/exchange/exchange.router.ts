import { BaseRouter } from '../base.router'

export class ExchangeRouter extends BaseRouter {
  public static path = '/exchange'
  private static instance: ExchangeRouter = null

  public static get router() {
    if (!ExchangeRouter.instance) ExchangeRouter.instance = new ExchangeRouter()

    return ExchangeRouter.instance.router
  }

  private constructor() {
    super()

    this.router.get('/', (req, res) => {
      //
    })
  }
}
