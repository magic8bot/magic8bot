import crypto from 'crypto'
import { Collection } from 'mongodb'

import { mongoService } from '../services/mongo.service'

interface SessionCollection {
  sessionId: string
  start_time: number
  last_run: number
}

export class SessionStore {
  private sessionId: string
  private collection: Collection<SessionCollection> = mongoService.connection.collection('beta_sessions')

  constructor() {
    this.collection.createIndex({ sessionId: 1 })
  }

  async newSession() {
    this.sessionId = crypto.randomBytes(4).toString('hex')
    const now = +new Date()

    const session = {
      sessionId: this.sessionId,
      start_time: now,
      last_run: now,
    }

    await this.collection.save(session)
  }

  async loadSession(sessionId: string) {
    const session = await this.collection.findOne({ sessionId })
    if (!session) throw new Error(`Invalid session id: ${sessionId}`)

    await this.collection.updateOne({ sessionId }, { last_run: +new Date() })
  }
}
