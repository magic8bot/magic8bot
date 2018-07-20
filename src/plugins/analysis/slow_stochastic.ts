export const slowStochastic = (s, key, k, d) => {
  if (!k) k = 14
  if (!d) d = 3
  if (s.lookback.length >= k + d * 2) {
    const stochK = []
    for (let j = 0; j < d; j++) {
      const stochs = []
      for (let i = 0; i < d; i++) {
        stochs.push(
          ((x, length) => {
            const low = []
            const high = []
            x.slice(0, length).forEach((period) => {
              low.push(period.low)
              high.push(period.high)
            })
            return (100 * (x[0].close - Math.min(...low))) / (Math.max(...high) - Math.min(...low))
          })(s.lookback.slice(i + j), k)
        )
      }
      stochK.push(
        stochs.reduce((sum, cur) => {
          return sum + cur
        }, 0) / d
      )
    }
    const stochD =
      stochK.reduce((sum, cur) => {
        return sum + cur
      }, 0) / d
    s.period[key] = { K: stochK[0], D: stochD }
  }
}
