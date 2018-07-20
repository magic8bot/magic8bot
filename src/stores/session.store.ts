import crypto from 'crypto'

import { dbDriver } from '@lib'

export class SessionStore {
  private sessionId: string

  async newSession() {
    this.sessionId = crypto.randomBytes(4).toString('hex')
    const now = +new Date()

    const session = {
      sessionId: this.sessionId,
      start_time: now,
      last_run: now,
    }

    await dbDriver.session.save(session)
  }

  async loadSession(sessionId: string) {
    const session = await dbDriver.session.findOne({ sessionId })
    if (!session) throw new Error(`Invalid session id: ${sessionId}`)

    await dbDriver.session.updateOne({ sessionId }, { last_run: +new Date() })
  }
}
