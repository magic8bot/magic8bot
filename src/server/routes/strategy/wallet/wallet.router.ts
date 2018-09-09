import { BaseRouter } from '../../base.router'
import { core } from '@core'

export class WalletRouter extends BaseRouter {
  public static path = '/wallet'
  private static instance: WalletRouter = null

  public static get router() {
    if (!WalletRouter.instance) WalletRouter.instance = new WalletRouter()

    return WalletRouter.instance.router
  }

  private constructor() {
    super()

    this.router.get('/', async ({ body }, res) => {
      const result = await core.getWallet(body)
      res.send(result)
    })

    this.router.put('/', async ({ body }, res) => {
      const result = await core.adjustWallet(body)
      res.send(result)
    })
  }
}
