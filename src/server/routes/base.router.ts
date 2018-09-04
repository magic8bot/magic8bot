import { Router } from 'express'

export abstract class BaseRouter {
  protected router: Router = Router()
}
