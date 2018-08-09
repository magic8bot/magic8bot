import { SessionStore } from './session.store'

describe('SessionStore', () => {
  let sessionStore: SessionStore

  beforeEach(() => {
    sessionStore = SessionStore.instance
  })

  it('should create new session', async (done) => {
    await sessionStore.newSession()

    expect(sessionStore.sessionId).toBeDefined()

    done()
  })

  xit('should load a session', async (done) => {
    await sessionStore.loadSession()

    expect(sessionStore.sessionId).toBeDefined()

    done()
  })
})
