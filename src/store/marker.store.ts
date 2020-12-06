import { Trade } from 'ccxt'
import { dbDriver, Marker } from '@lib'
import { StoreOpts } from '@m8bTypes'

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

    const nextMarker = await this.findInRange(storeOpts, marker.from - 1)
    if (!nextMarker) return marker.from

    this.setMarker(storeOpts, nextMarker)
    return this.getNextBackMarker(storeOpts)
  }

  public async getNextForwardMarker(storeOpts: StoreOpts, target: number) {
    const marker = await this.findInRange(storeOpts, target)
    if (marker) return this.getNextForwardMarker(storeOpts, marker.to + 1)
    return target
  }

  public async saveMarker(storeOpts: StoreOpts, to: number, from: number, trades: Trade[]) {
    const marker = this.makeMarker(storeOpts, to, from, trades)
    this.setMarker(storeOpts, marker)
    await dbDriver.marker.insertOne(marker)

    return marker
  }

  /* istanbul ignore next */
  public async findLatestTradeMarker({ exchange, symbol }: StoreOpts) {
    const marker = await dbDriver.marker.find({ exchange, symbol }).sort({ oldestTime: -1 }).limit(1).toArray()

    return marker.pop()
  }

  private getMarker(storeOpts: StoreOpts) {
    const idStr = this.makeIdStr(storeOpts)
    return this.markers.get(idStr)
  }

  private setMarker(storeOpts: StoreOpts, marker: Marker) {
    const idStr = this.makeIdStr(storeOpts)
    this.markers.set(idStr, marker)
  }

  private async findInRange({ exchange, symbol }: StoreOpts, cursor: number) {
    return dbDriver.marker.findOne({ exchange, symbol, to: { $gte: cursor }, from: { $lte: cursor } })
  }

  private makeMarker({ exchange, symbol }: StoreOpts, to: number, from: number, trades: Trade[]) {
    const newestTime = Math.max(...trades.map(({ timestamp }) => timestamp))
    const oldestTime = Math.min(...trades.map(({ timestamp }) => timestamp))
    return { exchange, symbol, to, from, oldestTime, newestTime }
  }

  private makeIdStr({ exchange, symbol }: StoreOpts) {
    return `${exchange}.${symbol}`
  }
}
