import { BaseRouter } from '../base.router'
import { core } from '@core'
import { WalletRouter } from './wallet'

export class StrategyRouter extends BaseRouter {
  public static path = '/strategy'
  private static instance: StrategyRouter = null

  public static get router() {
    if (!StrategyRouter.instance) StrategyRouter.instance = new StrategyRouter()

    return StrategyRouter.instance.router
  }

  private constructor() {
    super()

    this.router.get('/', async ({ query: { exchange } }, res) => {
      const result = await core.getStrategies({ exchange })
      res.send(result)
    })

    this.router.get('/list', async (req, res) => {
      const result = await core.listStrategies()
      res.send(result)
    })

    this.router.post('/', async ({ body }, res) => {
      const result = await core.addStrategy(body)
      res.send(result)
    })

    this.router.put('/', async ({ body }, res) => {
      const result = await core.updateStrategy(body)
      res.send(result)
    })

    this.router.delete('/', async ({ body }, res) => {
      const result = await core.deleteStrategy(body)
      res.send(result)
    })

    this.router.post('/start', async ({ body }, res) => {
      const result = await core.startStrategy(body)
      res.send(result)
    })

    this.router.post('/stop', async ({ body }, res) => {
      const result = await core.stopStrategy(body)
      res.send(result)
    })

    this.router.use(WalletRouter.path, WalletRouter.router)
  }
}
