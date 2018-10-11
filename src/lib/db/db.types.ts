import { Order, Trade } from 'ccxt'
import { Filter, ExchangeAuth } from '@m8bTypes'

export interface SessionCollection {
  sessionId: string
  startTime: number
  lastTime: number
}

export type TradeCollection = Trade & {
  exchange: string
  symbol: string
}

export interface PeriodItem {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  bucket?: number
}

export interface Marker {
  symbol: string
  exchange: string
  from: number
  to: number
  oldestTime: number
  newestTime: number
}

interface Fee {
  cost: number
  currency: string
  rate: number
}

export type TradeWithFee = Trade & { fee: Fee }

export type OrderWithTrades = Filter<Order, 'fee'> & {
  trades?: TradeWithFee[]
  fee: Fee
}

export type OrderCollection = OrderWithTrades & {
  sessionId: string
  strategy: string
  exchange: string
  symbol: string
}

export interface Options {
  session_id: string
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
  symbol: {
    exchange_id: string
    product_id: string
    asset: string
    currency: string
    normalized: string
  }
}

export interface Wallet {
  currency: number
  asset: number
}

export type WalletCollection = Wallet & {
  sessionId: string
  exchange: string
  symbol: string
  strategy: string
  time: number
}

export type Adjustment = Wallet & {
  type: 'user' | 'newOrder' | 'cancelOrder' | 'fillOrder'
}

export type AdjustmentCollection = Adjustment & {
  sessionId: string
  exchange: string
  symbol: string
  strategy: string
  time: number
}

export interface ExchangeAuthentication {
  apiKey: string
  secret: string
  uid?: string
  login?: string
  password?: string
  twofa?: string
  privateKey?: string
  walletAdress?: string
  client_id?: string
  sandbox?: boolean
  apiURI?: string
  websocketURI?: string
}

export interface ExchangeConfig {
  useTestEnvironment?: boolean
  exchange: string
  tradePollInterval: number
  auth: ExchangeAuthentication
}

export type ExchangeCollection = ExchangeConfig & {
  sessionId: string
}

export interface StrategyConfig {
  [key: string]: string | number | boolean
  symbol: string
  exchange: string
  strategy: string

  days: number
  period: string
  markDn: number
  markUp: number
  orderPollInterval: number
  orderSlippageAdjustmentTolerance: number
}

export type StrategyCollection = StrategyConfig & {
  sessionId: string
}
