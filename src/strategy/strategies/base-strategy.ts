import { PeriodItem, EVENT, eventBus } from '@lib'
import { EventBusListener } from '@magic8bot/event-bus'

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
 * The `BaseStrategy` alrady subscrbied the `onPeriod`-method on this event.
 * `onPeriod` should handle the indicator analysis and "calculate" a signal, which has to be
 * emited to the event-bus `EVENT.STRAT_SIGNAL`.
 */
export abstract class BaseStrategy<T = any> {

  /**
   * Defines the options used by a strategy
   */
  public options: T

  /**
   * Preroll-Flag. Its changed by prerollDone
   */
  protected isPreroll = true

  constructor(protected readonly name: string, protected exchange: string, protected symbol: string) {
    const periodUpdateListener: EventBusListener<PeriodItem[]> = eventBus.get(EVENT.PERIOD_UPDATE)(exchange)(symbol)(this.name).listen
    const periodNewListener: EventBusListener<void> = eventBus.get(EVENT.PERIOD_NEW)(exchange)(symbol)(this.name).listen

    periodUpdateListener((periods) => this.calculate(periods))
    periodNewListener(() => this.onPeriod())
  }

  /**
   * This method should implement the Indicator calculation.
   * It should not return anything. All states have to be saved within the strategy!
   *
   * On construction this method is subscribed to the event-bus `EVENT.PERIOD_UPDATE`.
   * it should emit its results to the event-bus `EVENT.STRAT_CALC`
   * @param periods OHLC candles to calculate the strategy
   */
  public abstract calculate(periods: PeriodItem[])
  /**
   * This method should implement the action, to do on evaluation of a "completed" period.
   * On construction this method is subscribed to the event-bus `EVENT.PERIOD_NEW`.
   * it should emit its signal to the event-bus `EVENT.STRAT_SIGNAL`.
   */
  public abstract onPeriod()

  /**
   * This method is called by the StragegyEngine, if preroll has been finished.
   * Next periods will be "real" trades and no historical data
   */
  public prerollDone() {
    this.isPreroll = false
  }

  // tslint:disable-next-line:no-empty
  public async init() {
    // whats its usage?
  }

  // tslint:disable-next-line:no-empty
  public async tick() {
    // whats its usage?
  }
}
