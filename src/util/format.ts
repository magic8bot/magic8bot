import n from 'numbro'

let maxFcWidth = 0

export const formatAsset = (amt, asset) => {
  return n(amt).format('0.00000000') + ' ' + asset
}

export const formatPercent = (ratio) => {
  return (ratio >= 0 ? '+' : '') + n(ratio).format('0.00%')
}

export const formatCurrency = (amt, currency, omitCurrency?, colorTrick?, doPad?) => {
  let str
  let fstr
  amt > 999
    ? (fstr = '0.00')
    : amt > 99
      ? (fstr = '0.000')
      : amt > 9
        ? (fstr = '0.0000')
        : amt > 0.9
          ? (fstr = '0.00000')
          : amt > 0.09
            ? (fstr = '0.000000')
            : amt > 0.009
              ? (fstr = '0.0000000')
              : (fstr = '0.00000000')
  str = n(amt).format(fstr)
  if (doPad) {
    maxFcWidth = Math.max(maxFcWidth, str.length)
    str = ' '.repeat(maxFcWidth - str.length) + str
  }
  if (colorTrick) {
    str = str.replace(/^(.*\.)(.*?)(0*)$/, (_, m1, m2, m3) => {
      return m1.cyan + m2.yellow + m3.grey
    })
  }
  return str + (omitCurrency ? '' : ' ' + currency)
}
