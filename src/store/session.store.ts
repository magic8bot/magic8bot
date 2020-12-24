import crypto from 'crypto'

import { dbDriver, SessionCollection } from '@magic8bot/db'

const singleton = Symbol()

export class SessionStore {
  public static get instance(): SessionStore {
    /* istanbul ignore next */
    if (!this[singleton]) this[singleton] = new SessionStore()
    return this[singleton]
  }

  private _sessionId: string = null

  private constructor() {}

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

    await dbDriver.session.insertOne(session)
  }

  public async loadSession() {
    const sessions = await dbDriver.session.find({}).sort({ lastTime: -1 }).limit(1).toArray()

    if (!sessions || !sessions.length) return this.newSession()

    const [session] = sessions

    this._sessionId = session.sessionId
    await dbDriver.session.updateOne({ sessionId: session.sessionId }, { $set: { lastTime: new Date().getTime() } })
  }
}
