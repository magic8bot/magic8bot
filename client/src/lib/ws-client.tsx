import { errorStore } from '../app/footer'

type Payload = Record<string, any>

class WsClient {
  private socket: WebSocket
  private actions: Map<string, (payload: Payload) => void> = new Map()
  private failures = 0

  public connect = () => {
    return new Promise((resolve) => {
      this.socket = new WebSocket('ws://localhost:19807')

      this.socket.onmessage = this.handleMessage
      this.socket.onclose = this.reconnect
      this.socket.onopen = () => {
        this.failures = 0
        resolve()
      }
    })
  }

  public broadcast(action: string, payload: Payload) {
    this.socket.send(JSON.stringify({ action, payload }))
  }

  public registerAction(actionName: string, actionFn: (payload: Payload) => void) {
    if (this.actions.has(actionName)) return

    this.actions.set(actionName, actionFn)
  }

  private handleMessage = ({ data }: MessageEvent) => {
    const body = data.toString()

    try {
      const parsed = JSON.parse(body)
      if (!parsed.action) return this.error('Invalid input: "action" missing')
      if (!parsed.payload) return this.error('Invalid input: "payload" missing')

      const { action, payload } = parsed
      if (!this.actions.has(action)) return

      this.actions.get(action)(payload)
    } catch (e) {
      this.error(`Invalid input: ${e.message}`)
    }
  }

  private reconnect = () => {
    this.failures++
    if (this.failures >= 5) return
    setTimeout(this.connect, 500 * this.failures)
  }

  private error(error: string) {
    errorStore.addError(error)
  }
}

export const wsClient = new WsClient()
wsClient.registerAction('error', ({ error }) => errorStore.addError(error))
