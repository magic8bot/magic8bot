import { SessionStore } from './session.store'

describe('SessionStore', () => {
  let sessionStore: SessionStore

  beforeAll(() => {
    sessionStore = SessionStore.instance
  })

  test('should create new session', async () => {
    await sessionStore.newSession()

    expect(sessionStore.sessionId).toBeDefined()
  })

  test('should create a new session if none exists', async () => {
    await sessionStore.loadSession()

    expect(sessionStore.sessionId).toBeDefined()
  })

  test('should actually load a session', async () => {
    await sessionStore.newSession()
    await sessionStore.loadSession()

    expect(sessionStore.sessionId).toBeDefined()
  })
})
