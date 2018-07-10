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
  replicaSet: string
  authMechanism?: string
}

interface MongoConn extends MongoBase {
  connectionString: string
}

export type MongoConf = MongoAuth | MongoConn

export interface Base {
  period: string
  min_periods: number
  period_length: string
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
  wait_for_settlement: number
  markdown_buy_pct: number
  markup_sell_pct: number
  order_type: string
  post_only: boolean
  days: number
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

export interface Strategy extends Partial<Base> {
  selector: string
  strategyName: string
  share: number
}

export interface ExchangeAuth {
  key?: string
  secret?: string
  username?: string
  b64secret?: string
  passphrase?: string
  wallet?: string
  client_id?: string
  sandbox?: boolean
  apiURI?: string
  websocketURI?: string
}

export interface ExchangeConf {
  name: string
  auth: ExchangeAuth
  options: {
    base?: Base
    strategies: Strategy[]
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

export interface Zenbot {
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

export interface IMinperiods {
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
  min_periods: IMinperiods
  markdown_buy_pct: IMinperiods
  markup_sell_pct: IMinperiods
  order_type: Ordertype
  sell_stop_pct: IMinperiods
  buy_stop_pct: IMinperiods
  profit_stop_enable_pct: IMinperiods
  profit_stop_pct: IMinperiods
  ema_short_period: IMinperiods
  ema_long_period: IMinperiods
  signal_period: IMinperiods
  up_trend_threshold: IMinperiods
  down_trend_threshold: IMinperiods
  overbought_rsi_periods: IMinperiods
  overbought_rsi: IMinperiods
}

export interface Trade {
  _id: string
  trade_id: number
  time: number
  size: number
  price: number
  side: string
  id: string
  selector: string
}

export interface Product {
  asset: string
  currency: string
  min_size: string
  max_size: string
  increment: string
  label: string
}
