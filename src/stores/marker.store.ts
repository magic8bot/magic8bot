import { Trade } from 'ccxt'
import { dbDriver, Marker } from '@lib'

const singleton = Symbol()
const singletonEnforcer = Symbol()

export class MarkerStore {
  public static get instance(): MarkerStore {
    if (!this[singleton]) this[singleton] = new MarkerStore(singletonEnforcer)
    return this[singleton]
  }

  private markers: Map<string, Marker> = new Map()

  constructor(enforcer: Symbol) {
    if (enforcer !== singletonEnforcer) {
      throw new Error('Cannot construct singleton')
    }
  }

  public async getNextBackMarker(exchange: string, symbol: string) {
    const marker = this.getMarker(exchange, symbol)
    if (!marker || !marker.from) return null

    const nextMarker = await this.findInRange(exchange, symbol, marker.from - 1)
    if (!nextMarker) return marker.from

    this.setMarker(exchange, symbol, nextMarker)
    return this.getNextBackMarker(exchange, symbol)
  }

  public async getNextForwardMarker(exchange: string, symbol: string, target: number) {
    const marker = await this.findInRange(exchange, symbol, target)
    if (marker) return this.getNextForwardMarker(exchange, symbol, marker.to + 1)
    return target
  }

  public async saveMarker(exchange: string, symbol: string, to: number, from: number, trades: Trade[]) {
    const marker = this.makeMarker(exchange, symbol, to, from, trades)
    this.setMarker(exchange, symbol, marker)
    await dbDriver.marker.save(marker)

    return marker
  }

  public async findLatestTradeMarker(exchange: string, symbol: string) {
    const marker = await dbDriver.marker
      .find({ exchange, symbol })
      .sort({ oldestTime: -1 })
      .limit(1)
      .toArray()

    return marker.pop()
  }

  private getMarker(exchange: string, symbol: string) {
    const idStr = this.makeIdStr(exchange, symbol)
    return this.markers.get(idStr)
  }

  private setMarker(exchange: string, symbol: string, marker: Marker) {
    const idStr = this.makeIdStr(exchange, symbol)
    this.markers.set(idStr, marker)
  }

  private async findInRange(exchange: string, symbol: string, cursor: number) {
    return dbDriver.marker.findOne({ exchange, symbol, to: { $gte: cursor }, from: { $lte: cursor } })
  }

  private makeMarker(exchange: string, symbol: string, to: number, from: number, trades: Trade[]) {
    const newestTime = Math.max(...trades.map(({ timestamp }) => timestamp))
    const oldestTime = Math.min(...trades.map(({ timestamp }) => timestamp))
    return { exchange, symbol, to, from, oldestTime, newestTime }
  }

  private makeIdStr(exchange: string, symbol: string) {
    return `${exchange}.${symbol}`
  }
}

// export const markerStore = new MarkerStore()
