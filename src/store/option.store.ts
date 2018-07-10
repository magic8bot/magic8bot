import { observable, action } from 'mobx'
import { makeOptions } from '../trader/util'

export interface Options {
  period: string
  strategy: string
  sell_stop_pct: number
  buy_stop_pct: number
  profit_stop_enable_pct: number
  profit_stop_pct: number
  max_slippage_pct: number
  buy_pct: number
  sell_pct: number
  order_adjust_time: number
  max_sell_loss_pct: number
  max_buy_loss_pct: number
  order_poll_time: number
  markdown_buy_pct: number
  markup_sell_pct: number
  order_type: string
  keep_lookback_periods: number
  poll_trades: number
  currency_capital: number
  asset_capital: number
  rsi_periods: number
  avg_slippage_pct: number
  min_prev_trades: number
  currency_increment: number
  use_prev_trades: boolean
  exact_buy_orders: boolean
  exact_sell_orders: boolean
  reset_profit: boolean
  use_fee_asset: boolean
  run_for: number
  debug: number
  stats: boolean
  mode: string
  selector: {
    exchange_id: string
    product_id: string
    asset: string
    currency: string
    normalized: string
  }
}

export class OptionStore {
  @observable public options: Options = {} as Options

  constructor(selector, argv, cmd, conf) {
    this.options = makeOptions(selector, argv, cmd, conf)
  }
}
