import { Bucket } from './bucket'
import { BucketSize } from './bucket-size'

export const timebucket = (...args) => {
  let size = 'ms'
  let value
  let bucketStr
  let date = false

  args.forEach((arg, idx) => {
    if (typeof arg === 'string') {
      if (arg.match(Bucket.regex)) {
        bucketStr = arg
      } else if (arg.match(BucketSize.regex)) {
        size = arg
      } else if (!Number.isNaN(Number(arg))) {
        value = Number(arg)
      }
    } else if (typeof arg === 'number') {
      value = arg
    } else if (arg instanceof Date) {
      value = arg.getTime()
      date = true
    } else {
      throw new TypeError('argument ' + (idx + 1) + ' must be string, number, or date')
    }
  })

  if (date) {
    return new Bucket('ms', value).resize(size)
  }

  if (bucketStr) return Bucket.fromString(bucketStr)

  if (typeof value === 'undefined') {
    return new Bucket('ms', new Date().getTime()).resize(size)
  }

  return new Bucket(size, value)
}

export const fromNumber = (num) => {
  return Bucket.fromNumber(num)
}
