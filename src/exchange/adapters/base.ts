import { Trade } from 'ccxt'
import WebSocket from 'ws';

export interface ExchangeAdapter {
  scan: 'back' | 'forward'
  getTradeCursor: (trade: Trade) => number
  mapTradeParams: (start: number) => { [key: string]: number }
}

export interface StreamExchangeAdapter {
  handleMessage(message: any)
  getSubscription(products: string[])
}

export class StreamExchange {

  private connection: WebSocket;
  constructor(
    private websocketEndpoint: string,
    private exchangeAdapter: StreamExchangeAdapter,
    private products: string[]) { }

  public close() {
    this.connection.close()
    this.connection.removeAllListeners()
    this.connection = null
  }

  public open() {
    this.connection = new WebSocket(this.websocketEndpoint);
    this.initHandlers()
  }

  public subscribe(subscription: any) {
    this.send(subscription)
  }

  private send(content: any) {
    if (this.connection.readyState === this.connection.OPEN) {
      this.connection.send(JSON.stringify(content))
    } else {
      console.log(`Socket is not yet open ${this.connection.readyState}`)
    }
  }
  private initHandlers() {
    this.connection.addEventListener('close', (event) => {
      console.log('Close Received')
      this.close()
      this.open()
    })
    this.connection.addEventListener('error', (event) => {
      console.log('Error Received')
      this.close()
      this.open()
    })
    this.connection.addEventListener('message', (event) => {
      this.exchangeAdapter.handleMessage(event.data)
    })
    this.connection.addEventListener('open', (event) => {
      console.log('on open ')
      this.subscribe(this.exchangeAdapter.getSubscription(this.products))
    })
  }
}
