import { BaseRouter } from '../base.router'
import { core } from '@core'
import { SyncRouter } from './sync'

export class ExchangeRouter extends BaseRouter {
  public static path = '/exchange'
  private static instance: ExchangeRouter = null

  public static get router() {
    if (!ExchangeRouter.instance) ExchangeRouter.instance = new ExchangeRouter()

    return ExchangeRouter.instance.router
  }

  private constructor() {
    super()

    this.router.get('/', async (req, res) => {
      const result = await core.getExchanges()
      res.send(result)
    })

    this.router.post('/', async ({ body }, res) => {
      const result = await core.addExchange(body)
      res.send(result)
    })

    this.router.put('/', async ({ body }, res) => {
      const result = await core.updateExchange(body)
      res.send(result)
    })

    this.router.delete('/', async ({ body: { exchange } }, res) => {
      const result = await core.deleteExchange({ exchange })
      res.send(result)
    })

    this.router.get('/symbols', async ({ query: { exchange } }, res) => {
      const result = await core.getSymbols({ exchange })
      res.send(result)
    })

    this.router.get('/balance', async ({ query: { exchange } }, res) => {
      const result = await core.getBalance({ exchange })
      res.send(result)
    })

    this.router.get('/list', (req, res) => {
      const exchanges = core.listExchanges()
      res.send(exchanges)
    })

    this.router.use(SyncRouter.path, SyncRouter.router)
  }
}
