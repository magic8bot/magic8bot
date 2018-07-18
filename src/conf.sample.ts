/**
 * @description Sample configuration. Chances are this will be reduced
 *              to only configure mongo and exchange authentication.
 *              All other config options will be through GUI.
 */

import { MongoConf, Base, ExchangeConf, Conf, Zenbot } from '@zbTypes'

// Your mongodb conf
const mongo: MongoConf = {
  host: 'localhost',
  port: 27017,
  db: 'zenbot4',
  username: null,
  password: null,
  replicaSet: null,
}

// Simulation settings
// NOT IMPLEMENTED
const sim = {
  currency_capital: 1000,
  asset_capital: 0,
  symmetrical: false,
}

const base: Base = {
  ...sim,
  days: 7,
  period: '1m',

  // BELOW NOT IMPLEMENTED
  min_periods: 1,
  sell_stop_pct: 0,
  buy_stop_pct: 0,
  profit_stop_enable_pct: 0,
  profit_stop_pct: 1,
  max_slippage_pct: 5,
  buy_pct: 100,
  sell_pct: 100,
  order_adjust_time: 500,
  max_sell_loss_pct: 5,
  max_buy_loss_pct: 5,
  order_poll_time: 500,
  wait_for_settlement: 500,
  markdown_buy_pct: 0,
  markup_sell_pct: 0,
  order_type: 'maker',
  post_only: true,
  keep_lookback_periods: 50000,
  poll_trades: 300,
  rsi_periods: 14,
  balance_snapshot_period: '15m',
  avg_slippage_pct: 0.045,
  cancel_after: 'day',
  use_prev_trades: false,
  min_prev_trades: 0,
  use_fee_asset: false,
  reset_profit: false,
  exact_buy_orders: false,
  exact_sell_orders: false,
  currency_increment: null,
}

const exchanges: ExchangeConf[] = [
  {
    // each exchange will inherit from base, unless overwritten
    exchangeName: 'gdax',
    auth: {
      key: '',
      b64secret: '',
      passphrase: '',
      apiURI: 'https://api.pro.coinbase.com',
      websocketURI: 'wss://ws-feed.pro.coinbase.com',
    },
    options: {
      strategies: [
        // each strategy will inherit from exchange, unless overwritten
        {
          selector: 'BTC-USD',
          strategyName: 'ta_macd',
          share: 0.25,
        },
        {
          selector: 'BCH-USD',
          strategyName: 'ta_macd',
          share: 0.25,
        },
        {
          selector: 'LTC-USD',
          strategyName: 'ta_macd',
          share: 0.25,
        },
        {
          selector: 'ETH-USD',
          strategyName: 'ta_macd',
          share: 0.25,
          period: '4m',
        },
      ],
    },
  },
  {
    exchangeName: 'binance',
    auth: {
      key: '',
      secret: '',
    },
    options: {
      strategies: [
        {
          selector: 'BTC-USDT',
          strategyName: 'ta_macd',
          share: 1,
        },
      ],
    },
  },
]

const conf: Conf = {
  // setting a session_id to a previous session will load that session
  // NOT YET IMPLEMENTED
  session_id: null,

  exchanges,
  ...base,

  // Only live mode works currently
  mode: 'live',
}

export const zenbot: Zenbot = {
  conf,
  mongo,

  port: 3000,
  version: null,
  srcRoot: null,
  debug: false,
}
