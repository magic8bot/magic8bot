import { WsServer } from './ws-server'
import { core } from '@core'

export const wsServer = new WsServer()

// Gross
wsServer.registerAction('get-my-config', async () => {
  const exchanges = await core.getMyConfig()
  wsServer.broadcast('get-my-config', { exchanges })
})

wsServer.registerAction('get-exchanges', async () => {
  const exchanges = await core.listExchanges()
  wsServer.broadcast('get-exchanges', { exchanges })
})
wsServer.registerAction('get-symbols', async (payload) => {
  const result = await core.getSymbols(payload)
  wsServer.broadcast('get-symbols', result)
})
wsServer.registerAction('get-balance', async (payload) => {
  const result = await core.getBalance(payload)
  wsServer.broadcast('get-balance', result)
})
wsServer.registerAction('add-exchange', async (payload) => {
  const result = await core.addExchange(payload)
  wsServer.broadcast('add-exchange', result)
})
wsServer.registerAction('update-exchange', async (payload) => {
  const result = await core.updateExchange(payload)
  wsServer.broadcast('update-exchange', result)
})
wsServer.registerAction('delete-exchange', async (payload) => {
  const result = await core.deleteExchange(payload)
  wsServer.broadcast('delete-exchange', result)
})

wsServer.registerAction('start-sync', async (payload) => {
  const result = await core.startSync(payload)
  wsServer.broadcast('start-sync', result)
})
wsServer.registerAction('stop-sync', async (payload) => {
  const result = await core.stopSync(payload)
  wsServer.broadcast('stop-sync', result)
})

wsServer.registerAction('get-strategies', async () => {
  const strategies = await core.listStrategies()
  wsServer.broadcast('get-strategies', { strategies })
})
wsServer.registerAction('add-strategy', async (payload) => {
  const result = await core.addStrategy(payload)
  wsServer.broadcast('add-strategy', result)
})
wsServer.registerAction('update-strategy', async (payload) => {
  const result = await core.updateStrategy(payload)
  wsServer.broadcast('update-strategy', result)
})
wsServer.registerAction('delete-strategy', async (payload) => {
  const result = await core.deleteStrategy(payload)
  wsServer.broadcast('delete-strategy', result)
})
wsServer.registerAction('adjust-wallet', async (payload) => {
  const result = await core.adjustWallet(payload)
  wsServer.broadcast('adjust-wallet', result)
})

wsServer.registerAction('start-strategy', async (payload) => {
  const result = await core.startStrategy(payload)
  wsServer.broadcast('start-strategy', result)
})
wsServer.registerAction('stop-strategy', async (payload) => {
  const result = await core.stopStrategy(payload)
  wsServer.broadcast('stop-strategy', result)
})
