interface MongoBase {
  host?: string
  port?: number
  db?: string
  username?: string
  password?: string
  replicaSet?: string
  authMechanism?: string
  connectionString?: string
}

interface MongoAuth extends MongoBase {
  host: string
  port: number
  db: string
  username: string
  password: string
  replicaSet?: string
  authMechanism?: string
}

interface MongoConn extends MongoBase {
  connectionString: string
}

export type MongoConf = MongoAuth | MongoConn

export interface Base {
  days: number
  period: string
  markDn: number
  markUp: number
  orderPollInterval: number

  min_periods: number
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
  wait_for_settlement: number
  order_type: string
  post_only: boolean
  keep_lookback_periods: number
  poll_trades: number
  rsi_periods: number
  balance_snapshot_period: string
  avg_slippage_pct: number
  cancel_after: string
  use_prev_trades: boolean
  min_prev_trades: number
  use_fee_asset: boolean
  reset_profit: boolean
  exact_buy_orders: boolean
  exact_sell_orders: boolean
  currency_increment: number
  currency_capital: number
  asset_capital: number
  symmetrical: boolean
}

export interface StrategyConf extends Partial<Base> {
  symbol: string
  strategyName: string
  share: {
    asset: number
    currency: number
  }
}

export interface ExchangeAuth {
  key?: string
  secret?: string
  username?: string
  apiKey?: string
  b64secret?: string
  password?: string
  passphrase?: string
  wallet?: string
  client_id?: string
  sandbox?: boolean
  apiURI?: string
  websocketURI?: string
}

export interface ExchangeConf {
  exchangeName: string
  tradePollInterval: number
  auth: ExchangeAuth
  options: {
    base?: Base
    strategies: StrategyConf[]
  }
}

export interface EngineConf extends Base {
  share: number
}

export interface Conf extends Base {
  session_id?: string
  exchanges: ExchangeConf[]
  mode: string
}

export interface Magic8bot {
  mongo: MongoConf
  conf: Conf

  port: number
  version: string
  srcRoot: string
  debug: boolean
}

export interface Quote {
  bid: number
  ask: number
}

export interface Ordertype {
  type: string
  options: string[]
}

export interface Minperiods {
  type: string
  min: number
  max: number
}

export interface Periodlength {
  type: string
  min: number
  max: number
  period_length: string
}

export interface Phenotypes {
  period_length: Periodlength
  min_periods: Minperiods
  markdown_buy_pct: Minperiods
  markup_sell_pct: Minperiods
  order_type: Ordertype
  sell_stop_pct: Minperiods
  buy_stop_pct: Minperiods
  profit_stop_enable_pct: Minperiods
  profit_stop_pct: Minperiods
  ema_short_period: Minperiods
  ema_long_period: Minperiods
  signal_period: Minperiods
  up_trend_threshold: Minperiods
  down_trend_threshold: Minperiods
  overbought_rsi_periods: Minperiods
  overbought_rsi: Minperiods
}

export interface Trade {
  _id: string
  trade_id: number
  time: number
  size: number
  price: number
  side: 'buy' | 'sell'
  id: string
  symbol: string
}

export interface Product {
  asset: string
  currency: string
  min_size: string
  max_size: string
  increment: string
  label: string
}

export type Signal = 'buy' | 'sell'

export interface SignalEvent {
  signal: Signal
}

export type FilterKeys<T, K extends keyof T> = { [P in keyof T]: P extends K ? never : P }[keyof T]
export type Filter<T, K extends keyof T> = Pick<T, FilterKeys<T, K>>
