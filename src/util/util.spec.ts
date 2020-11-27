jest.unmock('./async')

import { asyncTimeout, sleep } from './async'
import { precisionRound } from './precisionRound'
import { randomInRange, randomChoice } from './random'
import {
  fromCamelToSnake,
  fromCamelToKebab,
  fromSnakeToCamel,
  fromSnakeToKebab,
  fromKebabToCamel,
  fromKebabToSnake,
  fromAnyToCamel,
  fromAnyToSnake,
  fromAnyToKebab,
} from './string'
import { time, now } from './time'

describe('@util', () => {
  describe('#async', () => {
    // this is a bad test. Jest does some funny things with timers
    test.skip('sleep', async () => {
      const start = new Date().getTime()

      await sleep(1000)

      const end = new Date().getTime()

      expect(start < end).toEqual(true)
      expect(end - start > 1000).toEqual(true)
    })

    test('asyncTimeout', async () => {
      const mockFn = jest.fn().mockReturnValue('test')

      const result = await asyncTimeout(mockFn, 1000)

      expect(mockFn).toHaveBeenCalled()
      expect(result).toEqual('test')
    })
  })

  describe('#precisionRound', () => {
    test('precisionRound', () => {
      const result = precisionRound(123.456789, 2)

      expect(result).toEqual(123.46)
    })
  })

  describe('#random', () => {
    test('randomInRange', () => {
      const min = 1
      const max = 100
      const result = randomInRange(min, max)

      expect(result).toBeGreaterThan(min)
      expect(result).toBeLessThanOrEqual(max)
    })

    test('randomChoice', () => {
      const choices = ['foo', 'bar', 'fizz', 'bang', 'lorem', 'ipsum']
      const result = randomChoice(choices)

      const expected = { asymmetricMatch: (actual) => !!choices.find((choice) => choice === actual) }

      expect(result).toEqual(expected)
    })
  })

  describe('#string', () => {
    test('fromCamelToSnake', () => {
      const result = fromCamelToSnake('fromCamelToSnake')
      const expected = 'from_camel_to_snake'

      expect(result).toEqual(expected)
    })

    test('fromCamelToKebab', () => {
      const result = fromCamelToKebab('fromCamelToKebab')
      const expected = 'from-camel-to-kebab'

      expect(result).toEqual(expected)
    })

    test('fromSnakeToCamel', () => {
      const result = fromSnakeToCamel('from_snake_to_camel')
      const expected = 'fromSnakeToCamel'

      expect(result).toEqual(expected)
    })

    test('fromSnakeToKebab', () => {
      const result = fromSnakeToKebab('from_snake_to_kebab')
      const expected = 'from-snake-to-kebab'

      expect(result).toEqual(expected)
    })

    test('fromKebabToCamel', () => {
      const result = fromKebabToCamel('fromKebabToCamel')
      const expected = 'fromKebabToCamel'

      expect(result).toEqual(expected)
    })

    test('fromKebabToSnake', () => {
      const result = fromKebabToSnake('from-kebab-to-snake')
      const expected = 'from_kebab_to_snake'

      expect(result).toEqual(expected)
    })

    test('fromAnyToCamel', () => {
      const result = fromAnyToCamel('from_any_to_camel')
      const expected = 'fromAnyToCamel'

      expect(result).toEqual(expected)
    })

    test('fromAnyToSnake', () => {
      const result = fromAnyToSnake('from-any-to-snake')
      const expected = 'from_any_to_snake'

      expect(result).toEqual(expected)
    })

    test('fromAnyToKebab', () => {
      const result = fromAnyToKebab('fromAnyToKebab')
      const expected = 'from-any-to-kebab'

      expect(result).toEqual(expected)
    })
  })

  describe('#time', () => {
    const start = 10000000000

    test('now', () => {
      const result = now()

      expect(result).toBeDefined()
    })

    describe('add', () => {
      test('ms', () => {
        const result = time(start).add.ms(1)
        const expected = 10000000001

        expect(result).toEqual(expected)
      })

      test('s', () => {
        const result = time(start).add.s(1)
        const expected = 10000001000

        expect(result).toEqual(expected)
      })

      test('m', () => {
        const result = time(start).add.m(1)
        const expected = 10000060000

        expect(result).toEqual(expected)
      })

      test('h', () => {
        const result = time(start).add.h(1)
        const expected = 10003600000

        expect(result).toEqual(expected)
      })

      test('d', () => {
        const result = time(start).add.d(1)
        const expected = 10082800000

        expect(result).toEqual(expected)
      })
    })
    describe('sub', () => {
      test('ms', () => {
        const result = time(start).sub.ms(1)
        const expected = 9999999999

        expect(result).toEqual(expected)
      })

      test('s', () => {
        const result = time(start).sub.s(1)
        const expected = 9999999000

        expect(result).toEqual(expected)
      })

      test('m', () => {
        const result = time(start).sub.m(1)
        const expected = 9999940000

        expect(result).toEqual(expected)
      })

      test('h', () => {
        const result = time(start).sub.h(1)
        const expected = 9996400000

        expect(result).toEqual(expected)
      })

      test('d', () => {
        const result = time(start).sub.d(1)
        const expected = 9917200000

        expect(result).toEqual(expected)
      })
    })
  })
})
