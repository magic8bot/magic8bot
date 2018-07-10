import 'colors'

import minimist from 'minimist'
import objectifySelector from '../../lib/objectify-selector'
import path from 'path'
import { Options } from '../store/option.store'

export const makeOptions = (selector, argv, cmd, conf) => {
  const raw_opts = minimist(argv)
  const options = JSON.parse(JSON.stringify(raw_opts))

  delete options._

  if (cmd.conf) {
    var overrides = require(path.resolve(process.cwd(), cmd.conf))
    Object.keys(overrides).forEach(function(k) {
      options[k] = overrides[k]
    })
  }

  Object.keys(conf).forEach(function(k) {
    if (typeof cmd[k] !== 'undefined') {
      options[k] = cmd[k]
    }
  })

  options.currency_increment = cmd.currency_increment
  options.keep_lookback_periods = cmd.keep_lookback_periods
  options.use_prev_trades = cmd.use_prev_trades || conf.use_prev_trades
  options.min_prev_trades = cmd.min_prev_trades
  options.debug = cmd.debug
  options.stats = !cmd.disable_stats
  options.mode = options.paper ? 'paper' : 'live'

  options.order_type = !['maker', 'taker'].includes(options.order_type) ? 'maker' : options.order_type

  if (options.buy_max_amt) {
    console.log('--buy_max_amt is deprecated, use --deposit instead!\n'.red)
    options.deposit = options.buy_max_amt
  }

  options.selector = objectifySelector(selector || conf.selector)

  return (options as any) as Options
}
