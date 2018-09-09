import { BaseRouter } from '../../base.router'
import { core } from '@core'

export class SyncRouter extends BaseRouter {
  public static path = '/:exchange/sync/:symbol'
  private static instance: SyncRouter = null

  public static get router() {
    if (!SyncRouter.instance) SyncRouter.instance = new SyncRouter()

    return SyncRouter.instance.router
  }

  private constructor() {
    super()

    this.router.get('/', async ({ params: { exchange, symbol } }, res) => {
      const result = await core.getSync({ exchange, symbol })
      res.send(result)
    })

    this.router.post('/start', async ({ params: { exchange, symbol } }, res) => {
      const result = await core.startSync({ exchange, symbol })
      res.send(result)
    })

    this.router.post('/stop', async ({ params: { exchange, symbol } }, res) => {
      const result = await core.stopSync({ exchange, symbol })
      res.send(result)
    })
  }
}
