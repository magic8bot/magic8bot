export const crossover = (s, key1, key2) => {
  return s.period[key1] > s.period[key2] && s.lookback[0][key1] <= s.lookback[0][key2]
}

export const crossunder = (s, key1, key2) => {
  return s.period[key1] < s.period[key2] && s.lookback[0][key1] >= s.lookback[0][key2]
}

export const crossoverVal = (p1val1, p1val2, p2val1, p2val2) => {
  return p1val1 > p1val2 && p2val1 <= p2val2
}

export const crossunderVal = (p1val1, p1val2, p2val1, p2val2) => {
  return p1val1 < p1val2 && p2val1 >= p2val2
}

export const nz = (srcStr, val = 0) => {
  return typeof srcStr !== 'number' || isNaN(srcStr) ? val : srcStr
}

export const iff = (v, r, r2) => {
  return v !== undefined && v ? r : r2
}

export const hl2 = (period) => {
  return (period.high + period.low) / 2
}

export const hlc3 = (period) => {
  return (period.high + period.low + period.close) / 3
}

export const ohlc4 = (period) => {
  return (period.open + period.high + period.low + period.close) / 4
}

export const hAhlc3 = (period, lookback?) => {
  /*
    xClose = (Open+High+Low+Close)/4
    xOpen = [xOpen(Previous Bar) + xClose(Previous Bar)]/2
    xHigh = Max(High, xOpen, xClose)
    xLow = Min(Low, xOpen, xClose)
    */
  const haClose = (period.open + period.high + period.low + period.close) / 4
  const haClosePeriod = lookback !== undefined ? lookback : period
  const haClosePrev = (haClosePeriod.open + haClosePeriod.high + haClosePeriod.low + haClosePeriod.close) / 4
  const haOpen = (period.haOpen ? period.haOpen : period.open + haClosePrev) / 2
  const haHigh = Math.max(period.high, haOpen, haClose)
  const haLow = Math.min(period.low, haOpen, haClose)
  // save haOpen
  period.haOpen = haOpen
  return (haClose + haHigh + haLow) / 3
}

export const hAohlc4 = (period, lookback?) => {
  /*
    xClose = (Open+High+Low+Close)/4
    xOpen = [xOpen(Previous Bar) + xClose(Previous Bar)]/2
    xHigh = Max(High, xOpen, xClose)
    xLow = Min(Low, xOpen, xClose)
    */
  const haClose = (period.open + period.high + period.low + period.close) / 4
  const haClosePeriod = lookback !== undefined ? lookback : period
  const haClosePrev = (haClosePeriod.open + haClosePeriod.high + haClosePeriod.low + haClosePeriod.close) / 4
  const haOpen = (period.haOpen ? period.haOpen : period.open + haClosePrev) / 2
  const haHigh = Math.max(period.high, haOpen, haClose)
  const haLow = Math.min(period.low, haOpen, haClose)
  // save haOpen
  period.haOpen = haOpen
  return (haClose + haOpen + haHigh + haLow) / 4
}

// sample usage: let adjusted_lbks = s.lookback.map((period, i) => tv.src(period, s.options.src, s.lookback[i+1]))
export const src = (srcStr, period, lookback) => {
  if (!period) throw new Error('helpers src(). period undefined')

  if (!srcStr || srcStr === 'close') {
    return period.close
  } else if (srcStr === 'hl2') {
    return hl2(period)
  } else if (srcStr === 'hlc3') {
    return hlc3(period)
  } else if (srcStr === 'ohlc4') {
    return ohlc4(period)
  } else if (srcStr === 'HAhlc3') {
    return hAhlc3(period, lookback)
  } else if (srcStr === 'HAohlc4') {
    return hAohlc4(period, lookback)
  } else throw new Error(srcStr + ' not supported')
}

export const adjustByPct = (pct, n) => {
  return n * (pct / 100 + 1)
}

export const pivot = (s, leftBars, rightBars) => {
  const totalBars = leftBars + rightBars + 1
  const periods = [s.period, ...s.lookback.slice(0, totalBars - 1)].reverse()
  const lPeriods = periods.slice(0, leftBars)
  const rPeriods = periods.slice(leftBars + 1)
  const oPeriods = lPeriods.concat(rPeriods)
  const countH = oPeriods.reduce((p, c) => {
    return p + (typeof c.high !== 'undefined' && periods[leftBars].high > c.high ? 1 : 0)
  }, 0)
  const countL = oPeriods.reduce((p, c) => {
    return p + (typeof c.low !== 'undefined' && periods[leftBars].low < c.low ? 1 : 0)
  }, 0)
  return {
    high: countH === oPeriods.length ? periods[leftBars].high : null,
    low: countL === oPeriods.length ? periods[leftBars].low : null,
  }
}
