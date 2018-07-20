import crypto from 'crypto'

import { dbDriver, Marker } from '@lib'

export class MarkerStore {
  private markers: Map<string, Marker> = new Map()

  public newMarker(selector: string) {
    const marker = this.makeMarker(selector)
    this.markers.set(selector, marker)

    return marker
  }

  public getMarker(selector: string) {
    return this.markers.get(selector)
  }

  public setMarker(selector: string, marker: Marker) {
    this.markers.set(selector, marker)
  }

  public async saveMarker(selector: string) {
    const marker = this.markers.get(selector)
    await dbDriver.marker.save(marker)
  }

  public async loadMarkers(selector: string) {
    return dbDriver.marker.find({ selector }).toArray()
  }

  public async findInRange(selector: string, cursor: number) {
    return dbDriver.marker.findOne({ selector, to: { $gte: cursor }, from: { $lte: cursor } })
  }

  private makeMarker(selector: string) {
    const _id = crypto.randomBytes(4).toString('hex')
    return { _id, selector, to: null, from: null, oldest_time: null, newest_time: null }
  }
}
