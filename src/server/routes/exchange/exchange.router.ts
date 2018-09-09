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

    this.router.get('/list', (req, res) => {
      const exchanges = core.listExchanges()
      res.send(exchanges)
    })

    this.router.post('/:exchange', async ({ body, params: { exchange } }, res) => {
      const result = await core.addExchange({ ...body, exchange })
      res.send(result)
    })

    this.router.put('/:exchange', async ({ body, params: { exchange } }, res) => {
      const result = await core.updateExchange({ ...body, exchange })
      res.send(result)
    })

    this.router.delete('/:exchange', async ({ params: { exchange } }, res) => {
      const result = await core.deleteExchange({ exchange })
      res.send(result)
    })

    this.router.get('/:exchange/symbols', async ({ params: { exchange } }, res) => {
      const result = await core.getSymbols({ exchange })
      res.send(result)
    })

    this.router.get('/:exchange/balance', async ({ params: { exchange } }, res) => {
      const result = await core.getBalance({ exchange })
      res.send(result)
    })

    this.router.use(SyncRouter.path, SyncRouter.router)
  }
}
