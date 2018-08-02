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
      sessionId: this.sessionId,
      startTime: now,
      lastTime: now,
    }

    await dbDriver.session.save(session)
  }

  public async loadSession() {
    const sessions = await dbDriver.session
      .find({})
      .sort({ lastTime: -1 })
      .limit(1)
      .toArray()

    if (!sessions) return this.newSession()

    const [session] = sessions

    this._sessionId = session.sessionId
    await dbDriver.session.updateOne({ sessionId: session.sessionId }, { $set: { lastTime: new Date().getTime() } })
  }
}

export const sessionStore = new SessionStore()
