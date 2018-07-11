import crypto from 'crypto'

import { mongoService } from '../services/mongo.service'
import { Collection } from '../../node_modules/@types/mongodb'
import { Trade } from '@zbTypes'

export interface Marker {
  id: string
  _id: string
  selector: string
  from: number
  to: number
  oldest_time: number
  newest_time: number
}

export class MarkerStore {
  private collection: Collection<Marker> = mongoService.connection.collection('beta_markers')
  public marker: Marker

  constructor(private readonly selector: string) {}

  newMarker() {
    const id = crypto.randomBytes(4).toString('hex')

    this.marker = {
      id,
      selector: this.selector,
      to: null,
      from: null,
      oldest_time: null,
    } as Marker
  }

  async saveMarker() {
    await this.collection.save(this.marker)
  }

  async updateMarker(trade: Trade, tradeCursor: number) {
    if (!this.marker.from) {
      this.marker.from = tradeCursor
      this.marker.oldest_time = trade.time
      this.marker.newest_time = trade.time
    }

    this.marker.to = this.marker.to ? Math.max(this.marker.to, tradeCursor) : tradeCursor
    this.marker.newest_time = Math.max(this.marker.newest_time, trade.time)
  }
}
