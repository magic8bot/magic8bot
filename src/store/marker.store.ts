import crypto from 'crypto'
import { Collection } from 'mongodb'
import { action, observable, transaction } from 'mobx'

import { Trade } from '@zbTypes'
import { mongoService } from '../services/mongo.service'

export interface Marker {
  _id: string
  selector: string
  from: number
  to: number
  oldest_time: number
  newest_time: number
}

export class MarkerStore {
  private collection: Collection<Marker> = mongoService.connection.collection('beta_markers')
  @observable public marker: Marker

  constructor(private readonly selector: string) {}

  @action
  newMarker() {
    this.marker = this.makeMarker()
  }

  makeMarker() {
    const _id = crypto.randomBytes(4).toString('hex')
    return { _id, selector: this.selector, to: null, from: null, oldest_time: null, newest_time: null }
  }

  async saveMarker() {
    await this.collection.save(this.marker)
  }

  @action
  async updateMarker(trade: Trade, tradeCursor: number) {
    transaction(() => {
      if (!this.marker.from) {
        this.marker.from = tradeCursor
        this.marker.oldest_time = trade.time
        this.marker.newest_time = trade.time
      }

      this.marker.to = this.marker.to ? Math.max(this.marker.to, tradeCursor) : tradeCursor
      this.marker.newest_time = Math.max(this.marker.newest_time, trade.time)
    })
  }

  async loadMarkers() {
    const { selector } = this
    return await this.collection.find({ selector }).toArray()
  }
}
