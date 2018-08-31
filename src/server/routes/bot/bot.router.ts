import { BaseRouter } from '../base.router'

export class BotRouter extends BaseRouter {
  public static path = '/bot'
  private static instance: BotRouter = null

  public static get router() {
    if (!BotRouter.instance) BotRouter.instance = new BotRouter()

    return BotRouter.instance.router
  }

  private constructor() {
    super()

    this.router.get('/', (req, res) => {
      //
    })
  }
}
