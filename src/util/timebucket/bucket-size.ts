import moment, { unitOfTime } from 'moment'

export class BucketSize {
  static regex = /^(\d+)?([a-zA-Zµ]{1,2})$/
  static granularityMap = [
    'ms', // milliseconds
    's', // seconds
    'm', // minutes
    'h', // hours
    'd', // days
    'w', // weeks
    'M', // months
    'y', // years
  ]
  static valueMap = [1, 2, 5, 8, 10, 15, 30, 45, 100, 1000]

  public spec: string
  public value: number
  public granularity: unitOfTime.DurationConstructor

  constructor(spec: string) {
    this.spec = spec

    const { value, granularity } = this.parse(this.spec)
    this.value = value
    this.granularity = granularity
  }

  parse(spec: string) {
    const match = String(spec).match(BucketSize.regex)
    if (!match) throw new Error('invalid bucket size spec: ' + spec)
    if (!match[1]) match[1] = '1'

    return {
      value: Number(match[1]),
      granularity: match[2] as unitOfTime.DurationConstructor,
    }
  }

  toMilliseconds() {
    return moment(0)
      .add(this.value, this.granularity)
      .valueOf()
  }

  toString() {
    return this.value === 1 ? this.granularity : this.spec
  }

  pack() {
    const value = BucketSize.valueMap.indexOf(this.value)
    if (value === -1) throw new Error('value not serializable: ' + this.value)

    const granularity = BucketSize.granularityMap.indexOf(this.granularity)
    if (granularity === -1) throw new Error('granularity not serializable: ' + this.granularity)

    return String(value) + String(granularity)
  }

  static numberToSpec(num: number | string) {
    const str = String(num)
    const value = BucketSize.valueMap[str.charAt(0)]
    const granularity = BucketSize.granularityMap[str.charAt(1)]

    return value + granularity
  }
}
