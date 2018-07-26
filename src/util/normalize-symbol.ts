export const normalizeSymbol = (symbol) => {
  const parts = symbol.split('.')
  return parts[0].toLowerCase() + '.' + (parts[1] || '').toUpperCase()
}
