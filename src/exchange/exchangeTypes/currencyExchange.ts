import { ExchangeWrapper } from '../exchange.wrapper'
import Bottleneck from 'bottleneck'
import { logger } from '@util'
import { Order, Exchange } from 'ccxt'
import { ExchangeAdapter } from '../adapters/base'
import { gdax, binance, chaos } from '../adapters'

const adapters: Record<string, ExchangeAdapter> = { binance, gdax, chaos }

export class CurrencyExchange extends ExchangeWrapper {

    constructor(exchange: string, protected readonly exchangeConnection: Exchange) {
        super(exchange, exchangeConnection, adapters)
    }

    public amountToPrecision(amount: number) {
        return Math.floor(amount * 100000000) / 100000000
    }

    public async createOrder(symbol: string, type: string, side: string, amount: number, price: number): Promise<Order> {
        const fn = () => this.exchangeConnection.createOrder(symbol, type, side, amount, price)
        return this.bottleneck.schedule(fn)
      }

}
