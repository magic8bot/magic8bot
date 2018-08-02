import { EVENT } from './events.enum'

interface EventBusEvent {
  event: EVENT
  exchange: string
  symbol?: string
  strategy?: string
}

type EventData = Record<string, any>
type EventDataFn = (data: EventData) => void

type EventDataSet = Set<EventDataFn>
type StrategyMap = Map<string, EventDataSet>
type SymbolMap = Map<string, StrategyMap>
type ExchangeMap = Map<string, SymbolMap>
type EventMap = Map<EVENT, ExchangeMap>

export type EventBusEmitter<T = Record<string, any>> = (eventData?: T) => any

const optsErr = 'symbol is required if strategy is defined'

export class EventBus {
  private eventMap: EventMap = new Map()

  public register(eventBusEvent: EventBusEvent): EventBusEmitter {
    if (eventBusEvent.strategy && !eventBusEvent.symbol) throw new Error(optsErr)

    // pop onto next callstack
    return (eventData: EventData) => setImmediate(() => this.emit(eventBusEvent, eventData))
  }

  public subscribe(eventBusEvent: EventBusEvent, fn: EventDataFn) {
    if (eventBusEvent.strategy && !eventBusEvent.symbol) throw new Error(optsErr)

    const set = this.makeSet(eventBusEvent)
    set.add(fn)

    return () => set.delete(fn)
  }

  private emit({ event, exchange, symbol = 'all', strategy = 'all' }: EventBusEvent, eventData: EventData) {
    const set = this.getSet({ event, exchange, symbol, strategy })
    if (!set) return

    set.forEach((fn) => fn(eventData))

    if (symbol !== 'all') {
      this.emit({ event, exchange, symbol: 'all', strategy: 'all' }, eventData)
    } else if (strategy !== 'all') {
      this.emit({ event, exchange, symbol, strategy: 'all' }, eventData)
    }
  }

  private makeSet({ event, exchange, symbol = 'all', strategy = 'all' }: EventBusEvent) {
    const set = this.getSet({ event, exchange, symbol, strategy })
    if (set) return set

    if (!this.eventMap.has(event)) this.eventMap.set(event, new Map())

    const exchangeMap = this.eventMap.get(event)
    if (!exchangeMap.has(exchange)) exchangeMap.set(exchange, new Map())

    const symbolMap = exchangeMap.get(exchange)
    if (!symbolMap.has(symbol)) symbolMap.set(symbol, new Map())

    const strategyMap = symbolMap.get(symbol)
    if (!strategyMap.has(strategy)) strategyMap.set(strategy, new Set())

    return strategyMap.get(strategy)
  }

  private getSet({ event, exchange, symbol = 'all', strategy = 'all' }: EventBusEvent) {
    if (!this.eventMap.has(event)) return false

    const exchangeMap = this.eventMap.get(event)
    if (!exchangeMap.has(exchange)) return false

    const symbolMap = exchangeMap.get(exchange)
    if (!symbolMap.has(symbol)) return false

    const strategyMap = symbolMap.get(symbol)
    if (!strategyMap.has(strategy)) return false

    return strategyMap.get(strategy)
  }
}
