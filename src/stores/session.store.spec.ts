import { SessionStore } from './session.store'

describe('SessionStore', () => {
  let sessionStore: SessionStore

  beforeEach(() => {
    sessionStore = new SessionStore()
  })

  it('should create new session', async (done) => {
    await sessionStore.newSession()

    expect(sessionStore.sessionId).toBeDefined()

    done()
  })

  it('should load a session', async (done) => {
    await sessionStore.newSession()

    expect(async () => {
      await sessionStore.loadSession('random-string')

      done()
    }).not.toThrowError()
  })

  it('should throw on invalid sessionId', async (done) => {
    expect.assertions(1)

    const sessionId = 'invalid-string'
    await sessionStore.newSession()

    try {
      await sessionStore.loadSession(sessionId)
    } catch (e) {
      expect(e.message).toEqual(`Invalid session id: ${sessionId}`)
      done()
    }
  })
})
