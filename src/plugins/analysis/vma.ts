// Variable Moving Average, by Tushar S. Chande
// VMA automatically adjusts its smoothing constant on the basis of Market Volatility
export const vma = (s, key, length, sourceKey) => {
  if (!sourceKey) sourceKey = 'close'
  const k = 1.0 / length
  let iS
  if (s.lookback[0] !== undefined) {
    const pdm = Math.max(s.period[sourceKey] - s.lookback[0][sourceKey], 0)
    const mdm = Math.max(s.lookback[0][sourceKey] - s.period[sourceKey], 0)
    const pdmS = (s.period.pdmS = k * pdm + (s.lookback[0].pdmS !== undefined ? s.lookback[0].pdmS * (1 - k) : 0))
    const mdmS = (s.period.mdmS = k * mdm + (s.lookback[0].mdmS !== undefined ? s.lookback[0].mdmS * (1 - k) : 0))
    const s0 = pdmS + mdmS
    const pdi = pdmS / s0
    const mdi = mdmS / s0
    const pdiS = (s.period.pdiS = k * pdi + (s.lookback[0].pdiS !== undefined ? s.lookback[0].pdiS * (1 - k) : 0))
    const mdiS = (s.period.mdiS = k * mdi + (s.lookback[0].mdiS !== undefined ? s.lookback[0].mdiS * (1 - k) : 0))
    const d = Math.abs(pdiS - mdiS)
    const s1 = pdiS + mdiS
    iS = s.period.iS = (k * d) / s1 + (s.lookback[0].iS !== undefined ? s.lookback[0].iS * (1 - k) : 0)
  }
  if (s.lookback.length > length) {
    let hhv
    let llv
    s.lookback.slice(0, length).forEach((period) => {
      hhv = hhv !== undefined ? Math.max(hhv, period.iS) : period.iS
      llv = llv !== undefined ? Math.min(llv, period.iS) : period.iS
    })
    hhv = Math.max(hhv, iS)
    llv = Math.min(llv, iS)
    const d1 = hhv - llv
    const vI = (iS - llv) / d1
    const vmaVal = (s.period.vma =
      k * vI * s.period[sourceKey] + (s.lookback[0].vma !== undefined ? s.lookback[0].vma * (1 - k * vI) : 0))
    s.period[key] = vmaVal
  }
}
