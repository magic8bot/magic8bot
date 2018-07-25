// Linear Regression Curve
import regression from 'regression'

export const irc = (s, key, length, sourceKey) => {
  if (!sourceKey) sourceKey = 'close'
  if (s.lookback.length > length) {
    const data = []
    for (let i = length - 1; i >= 0; i--) {
      data.push([length - 1 - i, s.lookback[i][sourceKey]])
    }
    const result = regression.linear(data)
    s.period[key] = result.equation[1] + result.equation[0] * (length - 1)
  }
}
