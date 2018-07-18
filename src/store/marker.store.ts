import crypto from 'crypto'

import { Collection } from 'mongodb'
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
  private markers: Map<string, Marker> = new Map()
  private collection: Collection<Marker> = mongoService.connection.collection('beta_markers')

  constructor() {
    this.collection.createIndex('to')
    this.collection.createIndex('from')
    this.collection.createIndex('time')
  }

  newMarker(selector: string) {
    const marker = this.makeMarker(selector)
    this.markers.set(selector, marker)

    return marker
  }

  getMarker(selector: string) {
    return this.markers.get(selector)
  }

  setMarker(selector: string, marker: Marker) {
    this.markers.set(selector, marker)
  }

  async saveMarker(selector: string) {
    const marker = this.markers.get(selector)
    await this.collection.save(marker)
  }

  async loadMarkers(selector: string) {
    return await this.collection.find({ selector }).toArray()
  }

  async findInRange(selector: string, cursor: number) {
    return await this.collection.findOne({ selector, to: { $gte: cursor }, from: { $lte: cursor } })
  }

  private makeMarker(selector: string) {
    const _id = crypto.randomBytes(4).toString('hex')
    return { _id, selector, to: null, from: null, oldest_time: null, newest_time: null }
  }
}
