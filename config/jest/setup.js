jest.mock('pushbullet')
jest.mock('crypto', () => ({ randomBytes: () => ({ toString: () => 'random-string' }) }))

jest.mock('../../src/lib/ws-server', () => {
  const wsServer = {}
  return { wsServer }
})

jest.mock('../../src/lib/db/db-driver.lib', () => {
  const { db } = global

  const dbDriver = {
    get trade() {
      return db.collection('trades')
    },
    get session() {
      return db.collection('sessions')
    },
    get option() {
      return db.collection('options')
    },
    get marker() {
      return db.collection('markers')
    },
    get order() {
      return db.collection('orders')
    },
  }

  return { dbDriver }
})
