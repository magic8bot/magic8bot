export const momentum = (s, key, sourceKey, length) => {
  s.period[key] =
    s.lookback === undefined ||
    s.lookback.length < length ||
    s.period === undefined ||
    s.period[sourceKey] === undefined
      ? 0
      : (s.period[key] = s.period[sourceKey] - s.lookback[length - 1][sourceKey])
}
