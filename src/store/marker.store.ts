import crypto from 'crypto'

import { dbDriver, Marker } from '../lib'

export class MarkerStore {
  private markers: Map<string, Marker> = new Map()

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
    await dbDriver.marker.save(marker)
  }

  async loadMarkers(selector: string) {
    return await dbDriver.marker.find({ selector }).toArray()
  }

  async findInRange(selector: string, cursor: number) {
    return await dbDriver.marker.findOne({ selector, to: { $gte: cursor }, from: { $lte: cursor } })
  }

  private makeMarker(selector: string) {
    const _id = crypto.randomBytes(4).toString('hex')
    return { _id, selector, to: null, from: null, oldest_time: null, newest_time: null }
  }
}
