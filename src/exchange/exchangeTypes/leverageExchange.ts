import { ExchangeWrapper } from '../exchange.wrapper'
import { Order, Exchange } from 'ccxt'
import { bitmex } from '../adapters'
import { ExchangeAdapter } from '../adapters/base'

const adapters: Record<string, ExchangeAdapter> = { bitmex }

export class LeverageExchange extends ExchangeWrapper {

    constructor(exchange: string, protected readonly exchangeConnection: Exchange) {
        super(exchange, exchangeConnection, adapters)
    }

    public createOrder(symbol: string, type: string, side: string, amount: number, price: number): Promise<Order> {
        const fn = () => this.exchangeConnection.createOrder(symbol, type, side, amount, price, { leverage: this.exchangeConnection.leverage})
        return this.bottleneck.schedule(fn)
    }

}
