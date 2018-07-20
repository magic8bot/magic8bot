export default function Queue() {
  let a = []
  let b = 0
  this.getLength = () => {
    return a.length - b
  }
  this.isEmpty = () => {
    return 0 === a.length
  }
  this.enqueue = (d) => {
    a.push(d)
  }
  this.dequeue = () => {
    if (0 !== a.length) {
      const c = a[b]
      if (2 * ++b >= a.length) {
        a = a.slice(b)
        b = 0
      }

      return c
    }
  }
  this.peek = () => {
    return 0 < a.length ? a[b] : void 0
  }
}
