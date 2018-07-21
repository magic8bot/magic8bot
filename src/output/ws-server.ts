import WebSocket from 'ws'

type Payload = Record<string, any>

class WsServer {
  private server: WebSocket.Server
  private actions: Map<string, (payload: Payload) => void> = new Map()

  constructor() {
    this.server = new WebSocket.Server({ port: 8080 })
  }

  public init() {
    this.server.on('connection', (ws) => {
      ws.on('message', (body) => {
        const { action, payload } = JSON.parse(body.toString())
        if (!this.actions.has(action)) return

        this.actions.get(action)(payload)
      })
    })
  }

  public broadcast(action: string, payload: Payload) {
    this.server.clients.forEach((ws) => ws.send(JSON.stringify({ action, payload })))
  }

  public registerAction(actionName: string, actionFn: (payload: Payload) => void) {
    if (this.actions.has(actionName)) return

    this.actions.set(actionName, actionFn)
  }
}

export const wsServer = new WsServer()
