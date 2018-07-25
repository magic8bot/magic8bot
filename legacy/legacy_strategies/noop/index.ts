export default {
  name: 'noop',
  description: 'Just do nothing. Can be used to e.g. generate candlesticks for training the genetic forex strategy.',

  getOptions() {
    this.option('period', 'period length, same as --period_length', String, '30m')
    this.option('period_length', 'period length, same as --period', String, '30m')
  },

  calculate() {},

  onPeriod(s, cb) {
    cb()
  },

  onReport() {
    const cols = []
    return cols
  },
}
