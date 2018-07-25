import { dbDriver, Marker, TradeItem } from '@lib'

export class MarkerStore {
  private markers: Map<string, Marker> = new Map()

  public async getNextBackMarker(exchange: string, selector: string) {
    const marker = this.getMarker(exchange, selector)
    if (!marker || !marker.from) return null

    const nextMarker = await this.findInRange(exchange, selector, marker.from - 1)
    if (!nextMarker) return marker.from

    this.setMarker(exchange, selector, nextMarker)
    return this.getNextBackMarker(exchange, selector)
  }

  public async getNextForwardMarker(exchange: string, selector: string, target: number) {
    const marker = await this.findInRange(exchange, selector, target)
    if (marker) return this.getNextForwardMarker(exchange, selector, marker.to + 1)
    return target
  }

  public async saveMarker(exchange: string, selector: string, to: number, from: number, trades: TradeItem[]) {
    const marker = this.makeMarker(exchange, selector, to, from, trades)
    this.setMarker(exchange, selector, marker)
    await dbDriver.marker.save(marker)

    return marker
  }

  private getMarker(exchange: string, selector: string) {
    const idStr = this.makeIdStr(exchange, selector)
    return this.markers.get(idStr)
  }

  private setMarker(exchange: string, selector: string, marker: Marker) {
    const idStr = this.makeIdStr(exchange, selector)
    this.markers.set(idStr, marker)
  }

  private async findInRange(exchange: string, selector: string, cursor: number) {
    return dbDriver.marker.findOne({ exchange, selector, to: { $gte: cursor }, from: { $lte: cursor } })
  }

  private makeMarker(exchange: string, selector: string, to: number, from: number, trades: TradeItem[]) {
    const newestTime = Math.max(...trades.map(({ time }) => time))
    const oldestTime = Math.min(...trades.map(({ time }) => time))
    return { exchange, selector, to, from, oldestTime, newestTime }
  }

  private makeIdStr(exchange: string, selector: string) {
    return `${exchange}.${selector}`
  }
}
