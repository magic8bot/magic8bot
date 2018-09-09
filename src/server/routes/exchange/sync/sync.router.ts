import { BaseRouter } from '../../base.router'
import { core } from '@core'

export class SyncRouter extends BaseRouter {
  public static path = '/sync'
  private static instance: SyncRouter = null

  public static get router() {
    if (!SyncRouter.instance) SyncRouter.instance = new SyncRouter()

    return SyncRouter.instance.router
  }

  private constructor() {
    super()

    this.router.post('/start', async ({ body }, res) => {
      const result = await core.startSync(body)
      res.send(result)
    })

    this.router.post('/stop', async ({ body }, res) => {
      const result = await core.stopSync(body)
      res.send(result)
    })
  }
}
