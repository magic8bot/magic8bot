const { NODE_ENV } = process.env

const yargs = require('yargs')

const args = yargs.argv
process.env.MODE = args.mode

const isDev = NODE_ENV === 'development'

if (isDev) {
  require('tsconfig-paths/register')
  require('ts-node/register')
  if (args.mode === 'server') require('./src')
  else if (args.mode === 'service') require('./src/service')
} else {
  require('module-alias/register')
  if (args.mode === 'server') require('./dist')
  else if (args.mode === 'service') require('./dist/service')
}
