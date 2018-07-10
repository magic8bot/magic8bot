import 'colors'

import path from 'path'
import fs from 'fs'

import { loadStrategy } from '../plugins/strategies'

export default (program, conf) => {
  program
    .command('list-strategies')
    .description('list available strategies')
    .action(function(/*cmd*/) {
      const startPath = path.join(process.cwd(), 'src/plugins/strategies')
      var strategies = fs.readdirSync(startPath)
      strategies.forEach((strategy) => {
        if (fs.statSync(path.join(startPath, strategy)).isFile()) return
        let strat = loadStrategy(strategy)
        console.log(strat.name.cyan + (strat.name === conf.strategy ? ' (default)'.grey : ''))
        if (strat.description) {
          console.log('  description:'.grey)
          console.log('    ' + strat.description.grey)
        }
        console.log('  options:'.grey)
        var ctx = {
          option: function(name, desc, type, def) {
            console.log(
              ('    --' + name).green +
                '=<value>'.grey +
                '  ' +
                desc.grey +
                (typeof def !== 'undefined' ? ' (default: '.grey + def + ')'.grey : '')
            )
          },
        }
        strat.getOptions.call(ctx, strat)
        console.log()
      })
      process.exit()
    })
}
