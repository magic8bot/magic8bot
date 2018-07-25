import tulind, { Indicators } from 'tulind'

// tslint:disable-next-line:variable-name
export const Tulind = (indicatorName: keyof Indicators) => {
  const indicator = tulind.indicators[indicatorName].indicator
  return (inputs: number[], options: number[] = null) =>
    new Promise((resolve, reject) => indicator(inputs, options, (err, result) => (err ? reject(err) : resolve(result))))
}
