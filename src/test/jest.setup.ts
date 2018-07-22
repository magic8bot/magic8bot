jest.mock('pushbullet')
jest.mock('crypto', () => ({ randomBytes: () => ({ toString: () => 'random-string' }) }))

jest.mock('../lib/db/db-driver.lib', () => ({
  trade() {
    return this.db.trade
  },
  session() {
    return this.db.session
  },
  option() {
    return this.db.option
  },
  marker() {
    return this.db.marker
  },
  order() {
    return this.db.order
  },
}))
