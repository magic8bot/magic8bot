const { NODE_ENV } = process.env

const isDev = NODE_ENV !== 'production'

if (isDev) {
  require('tsconfig-paths/register')
  require('ts-node/register')
  require('./src')
} else {
  require('module-alias/register')
  require('./dist')
}
5
