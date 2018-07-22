import { EventBus, EVENT } from './event-bus'

describe('EventBus', () => {
  let eventBus: EventBus

  beforeEach(() => {
    eventBus = new EventBus()
  })

  it('should register new emitters', (done) => {
    const emitter = eventBus.register({ event: EVENT.TRADE, exchange: 'test' })
    expect(emitter).toBeDefined()
    expect(typeof emitter).toEqual('function')
    done()
  })

  it('should subscribe to events', (done) => {
    const eventBusEvent = { event: EVENT.TRADE, exchange: 'test' }
    eventBus.register(eventBusEvent)

    // tslint:disable-next-line
    const subscriber = eventBus.subscribe(eventBusEvent, (data) => {})

    expect(subscriber).toBeDefined()
    expect(typeof subscriber).toEqual('function')
    done()
  })

  it('should emit event data', (done) => {
    const eventBusEvent = { event: EVENT.TRADE, exchange: 'test' }
    const emitter = eventBus.register(eventBusEvent)

    const onData = jest.fn()
    eventBus.subscribe(eventBusEvent, onData)

    const foo = 'bar'
    emitter({ foo })

    setImmediate(() => {
      expect(onData).toHaveBeenCalledWith({ foo })
      done()
    })
  })

  it('should not emit data to unsubs', (done) => {
    const eventBusEvent = { event: EVENT.TRADE, exchange: 'test' }
    const emitter = eventBus.register(eventBusEvent)

    const onData = jest.fn()
    const subscriber = eventBus.subscribe(eventBusEvent, onData)

    const foo = 'bar'
    subscriber()
    emitter({ foo })

    setImmediate(() => {
      expect(onData).not.toHaveBeenCalled()
      done()
    })
  })
})
