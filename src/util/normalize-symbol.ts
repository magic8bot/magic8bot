export const normalizeSymbol = (symbol) => {
  const parts = symbol.split('.')
  if (parts.length !== 2) {
    throw new Error(`Invalid Symbol ${symbol}`)
  }
  return parts[0].toLowerCase() + '.' + parts[1].toUpperCase()
}
