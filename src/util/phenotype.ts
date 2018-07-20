/*
 * Magic8bot Genetic Backtester
 * Clifford Roche <clifford.roche@gmail.com>
 * 07/01/2017
 */

const PROPERTY_RANDOM_CHANCE = 0.3 // Chance of a Mutation to spawn a new species -- Try and prevent some stagnation
const PROPERTY_MUTATION_CHANCE = 0.3 // Chance of a Mutation in an aspect of the species
const PROPERTY_CROSSOVER_CHANCE = 0.5 // Chance of a aspect being inherited by another species

const create = (strategy) => {
  const r = {}
  for (const k in strategy) {
    const v = strategy[k]
    if (v.type === 'int') {
      r[k] = Math.floor(Math.random() * (v.max - v.min + 1) + v.min)
    } else if (v.type === 'int0') {
      r[k] = 0
      if (Math.random() >= 0.5) {
        r[k] = Math.floor(Math.random() * (v.max - v.min + 1) + v.min)
      }
    } else if (v.type === 'intfactor') {
      const factorString = v.factor.toString()
      const decimalIdx = factorString.indexOf('.') + 1
      const decimals = decimalIdx === 0 ? 0 : factorString.length - decimalIdx
      r[k] = (Math.floor((Math.random() * (v.max - v.min + v.factor)) / v.factor) * v.factor + v.min).toFixed(decimals)
    } else if (v.type === 'float') {
      r[k] = Math.random() * (v.max - v.min) + v.min
    } else if (v.type === 'period_length') {
      const s = Math.floor(Math.random() * (v.max - v.min + 1) + v.min)
      r[k] = s + v.period_length
    } else if (v.type === 'listOption') {
      const index = Math.floor(Math.random() * v.options.length)
      r[k] = v.options[index]
    } else if (v.type === 'maType') {
      const items = ['SMA', 'EMA', 'WMA', 'DEMA', 'TEMA', 'TRIMA', 'KAMA', 'MAMA', 'T3']
      const index = Math.floor(Math.random() * items.length)
      r[k] = items[index]
    } else if (v.type === 'uscSignalType') {
      const items = ['simple', 'low', 'trend']
      const index = Math.floor(Math.random() * items.length)
      r[k] = items[index]
    }
  }
  return r
}

const range = (v, step, stepSize) => {
  let scale = step / (stepSize - 1)

  if (v.type === 'int') {
    return Math.floor(scale * (v.max - v.min) + v.min)
  } else if (v.type === 'int0') {
    if (step === 0) return 0

    scale = (step - 1) / (stepSize - 2)
    return Math.floor(scale * (v.max - v.min) + v.min)
  } else if (v.type === 'intfactor') {
    const val = Math.floor(scale * (v.max - v.min) + v.min)
    return Math.floor(val / v.factor) * v.factor
  } else if (v.type === 'float') {
    return scale * (v.max - v.min) + v.min
  } else if (v.type === 'period_length') {
    const s = Math.floor(scale * (v.max - v.min) + v.min)
    return s + v.period_length
  } else if (v.type === 'listOption') {
    scale = step / stepSize
    const index = Math.floor(scale * v.options.length)
    return v.options[index]
  }
}

const mutation = (oldPhenotype, strategy) => {
  const r = create(strategy)
  if (Math.random() > PROPERTY_RANDOM_CHANCE) {
    for (const k in oldPhenotype) {
      if (k === 'sim') continue

      const v = oldPhenotype[k]
      r[k] = Math.random() < PROPERTY_MUTATION_CHANCE ? r[k] : v
    }
  }
  return r
}

const crossover = (phenotypeA, phenotypeB, strategy) => {
  const p1 = {}
  const p2 = {}

  for (const k in strategy) {
    if (k === 'sim') continue
    if (k === 'minTrades') continue
    if (k === 'fitnessCalcType') continue

    p1[k] = Math.random() <= PROPERTY_CROSSOVER_CHANCE ? phenotypeA[k] : phenotypeB[k]
    p2[k] = Math.random() <= PROPERTY_CROSSOVER_CHANCE ? phenotypeA[k] : phenotypeB[k]
  }

  return [p1, p2]
}

const fitness = (phenotype) => {
  if (typeof phenotype.sim === 'undefined') return 0
  let rate = 0
  if (phenotype.fitnessCalcType === 'profitwl') {
    const profit = phenotype.sim.profit + phenotype.sim.assetCapital * phenotype.sim.lastAssestValue
    // if minTrades is set use an alternate fitness calculation to hone in on a trade stratagy that
    // has the minimum trade count once found use the normal fitness strsategy to find the best parameters.
    if (phenotype.minTrades > 0) {
      if (phenotype.sim.wins < phenotype.minTrades && phenotype.sim.wins === 0) return 0.0
      if (phenotype.sim.wins < phenotype.minTrades) return (phenotype.sim.wins / phenotype.minTrades + profit) / 100
    }
    let wlRatio = phenotype.sim.wins / phenotype.sim.losses
    if (isNaN(wlRatio)) {
      // zero trades will result in 0/0 which is NaN
      wlRatio = 0
    }
    const wlRatioRate = 1.0 / (1.0 + Math.pow(Math.E, -wlRatio))
    rate = profit * wlRatioRate
  } else if (phenotype.fitnessCalcType === 'profit') {
    // let profit = phenotype.sim.profit
    const profit = phenotype.sim.profit + phenotype.sim.assetCapital * phenotype.sim.lastAssestValue
    // if minTrades is set use an alternate fitness calculation to hone in on a trade stratagy that
    // has the minimum trade count once found use the normal fitness strsategy to find the best parameters.
    if (phenotype.minTrades > 0) {
      if (phenotype.sim.wins < phenotype.minTrades && phenotype.sim.wins === 0) return 0.0
      if (phenotype.sim.wins < phenotype.minTrades) return (phenotype.minTrades + profit) / 1000
    }

    rate = profit
  }
  if (phenotype.fitnessCalcType === 'wl') {
    // let vsBuyHoldRate = phenotype.sim.profit
    // if minTrades is set use an alternate fitness calculation to hone in on a trade stratagy that
    // has the minimum trade count once found use the normal fitness strsategy to find the best parameters.
    if (phenotype.minTrades > 0) {
      if (phenotype.sim.wins < phenotype.minTrades && phenotype.sim.wins === 0) return 0.0
      if (phenotype.sim.wins < phenotype.minTrades) return phenotype.sim.wins / phenotype.minTrades / 100
    }
    let wlRatio = phenotype.sim.wins / phenotype.sim.losses
    if (isNaN(wlRatio)) {
      // zero trades will result in 0/0 which is NaN
      wlRatio = 0
    }
    const wlRatioRate = 1.0 / (1.0 + Math.pow(Math.E, -wlRatio))
    rate = wlRatioRate
  } else {
    const vsBuyHoldRate = (phenotype.sim.vsBuyHold + 100) / 50
    if (phenotype.minTrades > 0) {
      if (phenotype.sim.wins < phenotype.minTrades && phenotype.sim.wins === 0) return 0.0
      if (phenotype.sim.wins < phenotype.minTrades) {
        return (phenotype.sim.wins / phenotype.minTrades + vsBuyHoldRate) / 100
      }
    }
    let wlRatio = phenotype.sim.wins / phenotype.sim.losses
    if (isNaN(wlRatio)) {
      // zero trades will result in 0/0 which is NaN
      wlRatio = 1
    }
    const wlRatioRate = 1.0 / (1.0 + Math.pow(Math.E, -wlRatio))
    rate = vsBuyHoldRate * wlRatioRate
  }

  return rate
}

const competition = (phenotypeA, phenotypeB) => {
  // TODO: Refer to geneticalgorithm documentation on how to improve this with diverstiy
  return fitness(phenotypeA) >= fitness(phenotypeB)
}

const range0 = (min, max) => {
  const r = {
    max,
    min,
    type: 'int',
  }
  return r
}

const range1 = (min, max) => {
  const r = {
    max,
    min,
    type: 'int0',
  }
  return r
}

const rangeFactor = (min, max, factor) => {
  const r = {
    factor,
    max,
    min,
    type: 'intfactor',
  }
  return r
}

const rangeFloat = (min, max) => {
  const r = {
    max,
    min,
    type: 'float',
  }
  return r
}

const rangePeriod = (min, max, periodLength) => {
  const r = {
    max,
    min,
    periodLength,
    type: 'period_length',
  }
  return r
}

const rangeMaType = () => {
  const r = {
    options: ['SMA', 'EMA', 'WMA', 'DEMA', 'TEMA', 'TRIMA', 'KAMA', 'MAMA', 'T3'],
    type: 'listOption',
  }
  return r
}

const listOption = (options) => {
  const r = {
    options,
    type: 'listOption',
  }
  return r
}

export const phenotypes = {
  competition,
  create,
  crossover,
  fitness,
  listOption,
  mutation,
  range,
  range0,
  range1,
  rangeFactor,
  rangeFloat,
  rangeMaType,
  rangePeriod,
}
