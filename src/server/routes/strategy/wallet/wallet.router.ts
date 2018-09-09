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

    this.router.get('/', async ({ query: { exchange, symbol, strategy } }, res) => {
      const result = await core.getWallet({ exchange, symbol, strategy })
      res.send(result ? result : { asset: 0, currency: 0 })
    })

    this.router.put('/', async ({ body }, res) => {
      const result = await core.adjustWallet(body)
      res.send(result)
    })
  }
}
