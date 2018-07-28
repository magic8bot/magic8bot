import crypto from 'crypto'

import { dbDriver, SessionCollection } from '@lib'

export class SessionStore {
  private _sessionId: string = null

  public get sessionId() {
    return this._sessionId
  }

  public async newSession() {
    this._sessionId = crypto.randomBytes(4).toString('hex')
    const now = new Date().getTime()

    const session: SessionCollection = {
      last_run: now,
      sessionId: this.sessionId,
      start_time: now,
    }

    await dbDriver.session.save(session)
  }

  public async loadSession() {
    const session = await dbDriver.session.findOne({ $query: {}, $orderBy: { time: -1 } })
    if (!session) return this.newSession()

    this._sessionId = session.sessionId
    await dbDriver.session.updateOne({ sessionId: session.sessionId }, { $set: { last_run: new Date().getTime() } })
  }
}

export const sessionStore = new SessionStore()
