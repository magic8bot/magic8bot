export const chunkedMax = (numbers: number[], chunkLength = 5000) =>
  Math.max(
    ...new Array(Math.ceil(numbers.length / chunkLength))
      .fill(null)
      .map((_) => Math.max(...numbers.splice(0, chunkLength)))
      .concat()
  )

export const chunkedMin = (numbers: number[], chunkLength = 5000) =>
  Math.min(
    ...new Array(Math.ceil(numbers.length / chunkLength))
      .fill(null)
      .map((_) => Math.min(...numbers.splice(0, chunkLength)))
      .concat()
  )
