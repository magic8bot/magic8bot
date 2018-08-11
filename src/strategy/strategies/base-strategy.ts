import { PeriodItem, EVENT, eventBus } from '@lib'
import { EventBusListener, EventBusEmitter } from '@magic8bot/event-bus'
import { SignalEvent, Signal } from '@m8bTypes'

/**
 * This class defines the base functionality of a strategy.
 *
 * Changes on the current periods are published via event-bus `EVENT.PERIOD_UPDATE`.
 * The `BaseStrategy` already subscribed the `calculate`-method on this event.
 * `calculate` is called for every change on the current period and it should handle
 * each calculation which is done by the strategy, as soon as the calculation finished it
 * should emit its results to the event-bus `EVENT.STRAT_CALC`
 *
 * If there is a period completed this will be published by the event-bus `EVENT.PERIOD_NEW`.
 * The `BaseStrategy` already subscribed the `onPeriod`-method on this event.
 * `onPeriod` should handle the indicator analysis and "calculate" a signal, which has to be
 * emitted to the event-bus `EVENT.STRAT_SIGNAL`.
 */
export abstract class BaseStrategy<TOptions = any, TCalcResult = any> {
  /**
   * Defines the options used by a strategy
   */
  public options: TOptions

  /**
   * Preroll-Flag. Its changed by prerollDone
   */
  protected isPreroll = true

  /**
   * Emitter to publish new signals to the bot
   */
  protected signalEmitter: EventBusEmitter<SignalEvent>

  /**
   * Emitter to publish a calculation to the bot
   */
  protected calcEmitter: EventBusEmitter<TCalcResult>

  constructor(protected readonly name: string, protected exchange: string, protected symbol: string) {
    const periodUpdateListener: EventBusListener<PeriodItem[]> = eventBus.get(EVENT.PERIOD_UPDATE)(exchange)(symbol)(this.name).listen
    const periodNewListener: EventBusListener<void> = eventBus.get(EVENT.PERIOD_NEW)(exchange)(symbol)(this.name).listen

    /* istanbul ignore next */
    periodUpdateListener((periods) => {
      const result = this.calculate(periods)
      if (result && Object.keys(result).length === 0) {
        this.calcEmitter(result)
      }
    })

    /* istanbul ignore next */
    periodNewListener(() => {
      const signal = this.onPeriod()
      if (signal) {
        this.signalEmitter({ signal })
      }
    })

    this.signalEmitter = eventBus.get(EVENT.STRAT_SIGNAL)(exchange)(symbol)(this.name).emit
    this.calcEmitter = eventBus.get(EVENT.STRAT_CALC)(exchange)(symbol)(this.name).emit
  }

  /**
   * This method should implement the Indicator calculation.
   * It should not return anything. All states have to be saved within the strategy!
   *
   * On construction this method is subscribed to the event-bus `EVENT.PERIOD_UPDATE`.
   * the returned value is emitted to the event-bus `EVENT.STRAT_CALC`
   * @param periods OHLC candles to calculate the strategy
   */
  public abstract calculate(periods: PeriodItem[]): TCalcResult

  /**
   * This method should implement the action, to do on evaluation of a "completed" period.
   * On construction this method is subscribed to the event-bus `EVENT.PERIOD_NEW`.
   * the returned signal is emitted to the event-bus `EVENT.STRAT_SIGNAL`.
   */
  public abstract onPeriod(): Signal

  /**
   * This method is called by the StrategyEngine, if preroll has been finished.
   * Next periods will be "real" trades and no historical data
   */
  public prerollDone() {
    this.isPreroll = false
  }
}
