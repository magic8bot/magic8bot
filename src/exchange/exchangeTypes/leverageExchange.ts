import { ExchangeWrapper } from '../exchange.wrapper'
import { Order, Exchange } from 'ccxt'
import { bitmex } from '../adapters'
import { ExchangeAdapter } from '../adapters/base'
import { logger } from '@util'

const adapters: Record<string, ExchangeAdapter> = { bitmex }

export class LeverageExchange extends ExchangeWrapper {

    constructor(exchange: string, protected readonly exchangeConnection: Exchange) {
        super(exchange, exchangeConnection, adapters)
    }

    public amountToPrecision(amount: number, currentPrice: number) {
        return amount / (1 / currentPrice)
        // return Math.floor(amount / (1 / currentPrice))
        // return (Math.floor(amount * 100000000) / 100000000) / currentPrice
    }

    public createOrder(symbol: string, type: string, side: string, amount: number, price: number): Promise<Order> {
        // await exchange.createOrder('ETH/BTC', 'limit', 'sell', amount, limit_price, { 'stop': 'loss', 'stop_price': stop_price })
        // const fn = () => this.exchangeConnection.createOrder(symbol, type, side, amount, price, { leverage: this.exchangeConnection.leverage, stop: 'loss', stop_price: 12})
        logger.error('Buy amount ' + amount)
        const fn = () => this.exchangeConnection.createLimitBuyOrder(symbol, amount, price, { leverage: this.exchangeConnection.leverage, stop: 'loss', stop_price: price - 100 })
        return this.bottleneck.schedule(fn)
    }

}
