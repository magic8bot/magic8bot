export const precisionRound = (num: number, precision: number) => {
  const factor = Math.pow(10, precision)
  return Math.round(num * factor) / factor
}
