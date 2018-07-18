import { BucketSize } from './bucket-size'

export class Bucket {
  static regex = /^((?:\d+)?(?:[a-zA-Zµ]{1,2}))(\-?\d+)$/

  private size: BucketSize
  private value: number

  constructor(spec: string, value: number | string) {
    this.size = new BucketSize(spec)
    this.value = Number(value)
  }

  static fromString(bucketStr) {
    const match = bucketStr.match(Bucket.regex)
    if (!match) throw new Error('invalid bucket string: ' + bucketStr)

    return new Bucket(match[1], match[2])
  }

  static fromNumber(num: number | string) {
    const str = String(num)
    const spec = BucketSize.numberToSpec(str.slice(-2))
    const value = str.substr(0, str.length - 2)

    return new Bucket(spec, value)
  }

  toString() {
    return this.size.toString() + this.value
  }

  toJSON() {
    return this.toString()
  }

  toMilliseconds() {
    return this.size.toMilliseconds() * this.value
  }

  toDate() {
    return new Date(this.toMilliseconds())
  }

  resize(spec) {
    const size = new BucketSize(spec)
    if (size.granularity === this.size.granularity && size.value === this.size.value) return this

    const value = Math.floor(this.toMilliseconds() / size.toMilliseconds())
    return new Bucket(size.spec, value)
  }

  add(value) {
    this.value += Math.floor(value)
    return this
  }

  subtract(value) {
    this.value -= Math.floor(value)
    return this
  }

  multiply(value) {
    this.value = Math.floor(this.value * value)
    return this
  }

  divide(value) {
    this.value = Math.floor(this.value / value)
    return this
  }

  toNumber() {
    return Number(String(this.value) + this.size.pack())
  }
}
