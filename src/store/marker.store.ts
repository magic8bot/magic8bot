import { Trade } from 'ccxt'
import { MarkerModel, Marker } from '@magic8bot/db'

import { StoreOpts } from '@m8bTypes'
import { chunkedMax, chunkedMin } from '../util/math'

const singleton = Symbol()

export class MarkerStore {
  public static get instance(): MarkerStore {
    /* istanbul ignore next */
    if (!this[singleton]) this[singleton] = new MarkerStore()
    return this[singleton]
  }

  private markers: Map<string, Marker> = new Map()

  private constructor() {}

  public async getNextBackMarker(storeOpts: StoreOpts) {
    const marker = this.getMarker(storeOpts)
    if (!marker || !marker.from) return null

    const nextMarker = await MarkerModel.findInRange(storeOpts, marker.from - 1)
    if (!nextMarker) return marker.from

    this.setMarker(storeOpts, nextMarker)
    return this.getNextBackMarker(storeOpts)
  }

  public async getNextForwardMarker(storeOpts: StoreOpts, target: number) {
    const marker = await MarkerModel.findInRange(storeOpts, target)
    if (marker) return this.getNextForwardMarker(storeOpts, marker.to + 1)
    return target
  }

  public async saveMarker(storeOpts: StoreOpts, to: number, from: number, trades: Trade[]) {
    const marker = this.makeMarker(storeOpts, to, from, trades)
    this.setMarker(storeOpts, marker)
    await MarkerModel.saveMarker(marker)

    return marker
  }

  /* istanbul ignore next */
  public async findLatestTradeMarker(storeOpts: StoreOpts) {
    return MarkerModel.findLatestTradeMarker(storeOpts)
  }

  private getMarker(storeOpts: StoreOpts) {
    const idStr = this.makeIdStr(storeOpts)
    return this.markers.get(idStr)
  }

  private setMarker(storeOpts: StoreOpts, marker: Marker) {
    const idStr = this.makeIdStr(storeOpts)
    this.markers.set(idStr, marker)
  }

  private makeMarker({ exchange, symbol }: StoreOpts, to: number, from: number, trades: Trade[]) {
    const newestTime = chunkedMax(trades.map(({ timestamp }) => timestamp))
    const oldestTime = chunkedMin(trades.map(({ timestamp }) => timestamp))
    return { exchange, symbol, to, from, oldestTime, newestTime }
  }

  private makeIdStr({ exchange, symbol }: StoreOpts) {
    return `${exchange}.${symbol}`
  }
}
