export enum EVENT {
  PERIOD = 'period',
  TRADE = 'trade',
  ORDER = 'order',
  BOOK = 'book',
}

interface EventBusEvent {
  event: EVENT
  exchange: string
  selector?: string
  strategy?: string
}

type EventData = Record<string, any>
type EventDataFn = (data: EventData) => void

type EventDataSet = Set<EventDataFn>
type StrategyMap = Map<string, EventDataSet>
type SelectorMap = Map<string, StrategyMap>
type ExchangeMap = Map<string, SelectorMap>
type EventMap = Map<EVENT, ExchangeMap>

export class EventBus {
  private eventMap: EventMap = new Map()

  public register(eventBusEvent: EventBusEvent) {
    // pop onto next callstack
    return (eventData: EventData) => setImmediate(() => this.emit(eventBusEvent, eventData))
  }

  public subscribe(eventBusEvent: EventBusEvent, fn: EventDataFn) {
    const set = this.makeSet(eventBusEvent)
    set.add(fn)

    return () => set.delete(fn)
  }

  private emit({ event, exchange, selector = 'all', strategy = 'all' }: EventBusEvent, eventData: EventData) {
    const set = this.getSet({ event, exchange, selector, strategy })
    if (!set) return

    set.forEach((fn) => fn(eventData))

    if (selector !== 'all') {
      this.emit({ event, exchange, selector: 'all', strategy: 'all' }, eventData)
    } else if (strategy !== 'all') {
      this.emit({ event, exchange, selector, strategy: 'all' }, eventData)
    }
  }

  private makeSet({ event, exchange, selector = 'all', strategy = 'all' }: EventBusEvent) {
    const set = this.getSet({ event, exchange, selector, strategy })
    if (set) return set

    if (!this.eventMap.has(event)) this.eventMap.set(event, new Map())

    const exchangeMap = this.eventMap.get(event)
    if (!exchangeMap.has(exchange)) exchangeMap.set(exchange, new Map())

    const selectorMap = exchangeMap.get(exchange)
    if (!selectorMap.has(selector)) selectorMap.set(selector, new Map())

    const strategyMap = selectorMap.get(selector)
    if (!strategyMap.has(strategy)) strategyMap.set(strategy, new Set())

    return strategyMap.get(strategy)
  }

  private getSet({ event, exchange, selector = 'all', strategy = 'all' }: EventBusEvent) {
    if (!this.eventMap.has(event)) return false

    const exchangeMap = this.eventMap.get(event)
    if (!exchangeMap.has(exchange)) return false

    const selectorMap = exchangeMap.get(exchange)
    if (!selectorMap.has(selector)) return false

    const strategyMap = selectorMap.get(selector)
    if (!strategyMap.has(strategy)) return false

    return strategyMap.get(strategy)
  }
}
