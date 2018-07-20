import { BucketSize } from './bucket-size'

export class Bucket {
  public static regex = /^((?:\d+)?(?:[a-zA-Zµ]{1,2}))(\-?\d+)$/

  public static fromString(bucketStr) {
    const match = bucketStr.match(Bucket.regex)
    if (!match) throw new Error('invalid bucket string: ' + bucketStr)

    return new Bucket(match[1], match[2])
  }

  public static fromNumber(num: number | string) {
    const str = String(num)
    const spec = BucketSize.numberToSpec(str.slice(-2))
    const value = str.substr(0, str.length - 2)

    return new Bucket(spec, value)
  }

  private size: BucketSize
  private value: number

  constructor(spec: string, value: number | string) {
    this.size = new BucketSize(spec)
    this.value = Number(value)
  }

  public toString() {
    return this.size.toString() + this.value
  }

  public toJSON() {
    return this.toString()
  }

  public toMilliseconds() {
    return this.size.toMilliseconds() * this.value
  }

  public toDate() {
    return new Date(this.toMilliseconds())
  }

  public resize(spec) {
    const size = new BucketSize(spec)
    if (size.granularity === this.size.granularity && size.value === this.size.value) return this

    const value = Math.floor(this.toMilliseconds() / size.toMilliseconds())
    return new Bucket(size.spec, value)
  }

  public add(value) {
    this.value += Math.floor(value)
    return this
  }

  public subtract(value) {
    this.value -= Math.floor(value)
    return this
  }

  public multiply(value) {
    this.value = Math.floor(this.value * value)
    return this
  }

  public divide(value) {
    this.value = Math.floor(this.value / value)
    return this
  }

  public toNumber() {
    return Number(String(this.value) + this.size.pack())
  }
}
