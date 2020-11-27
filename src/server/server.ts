import express from 'express'
import errorHandler from 'errorhandler'
import bodyParser from 'body-parser'
import compression from 'compression'
import cors from 'cors'

import { ApiRouter } from './routes'

class Server {
  private app: express.Application

  constructor() {
    this.app = express()
    this.config()
    this.routes()
  }

  public init(port = 8080) {
    return new Promise<void>((resolve) => {
      this.app.listen(port, () => {
        console.log(`Listening on port: ${port}`)
        resolve()
      })
    })
  }

  private config() {
    this.app.use(bodyParser.json())
    this.app.use(bodyParser.urlencoded({ extended: true }))

    this.app.use(cors())
    this.app.use(compression())

    this.app.use((err: any, req, res, next) => {
      err.status = 404
      next(err)
    })

    this.app.use(errorHandler())
  }

  private routes() {
    this.app.use(ApiRouter.path, ApiRouter.router)
    this.app.get('/', (req, res) => res.send({ status: 200 }))
  }
}

export const server = new Server()
