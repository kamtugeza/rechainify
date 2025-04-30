import { expect, it } from 'vitest'
import every from '../src/every'

function buildTest () {
  return every({
    currency: (symbol: string) => (input: unknown) => {
      const isCurrency = typeof symbol === 'string' && typeof input === 'string' && input.startsWith(symbol) 
      return isCurrency ? Number.parseFloat(input.slice(symbol.length)) : null 
    },
    gte: (gte: number) => (input: unknown) => {
      const isGreaterOrEqual = typeof gte === 'number' && typeof input === 'number' && input >= gte
      return isGreaterOrEqual ? input : null
    }, 
    number: (input: unknown) => typeof input === 'number' ? input * 2 : null,
    positive: (input: unknown) => typeof input === 'number' && input >=0  ? input : null,
    infinite: (input: unknown = Infinity) => !Number.isFinite(input) ? input : null,
  })
}

it('returns `null` when there is no steps', () => {
  const chain = every([])

  expect(chain()).toBe(undefined)
  expect(chain(null)).toBe(null)
  expect(chain(5)).toBe(5) 
  expect(chain(7n)).toBe(7n)
  expect(chain('abc')).toBe('abc')

  const inputArray = [] as const
  expect(chain(inputArray)).toBe(inputArray)

  const inputObject = {}
  expect(chain(inputObject)).toBe(inputObject)
})

it('returns the result of the plain step if it is not `null`', () => {
  const chain = buildTest()

  expect(chain.number(5)).toBe(10)
  expect(chain.number('abc')).toBe(null)

  expect(chain.positive(5)).toBe(5)
  expect(chain.positive(-5)).toBe(null)
  expect(chain.positive('abc')).toBe(null)
})

it('returns the result of the factory step if it is not `null`', () => {
  const chain = buildTest()

  expect(chain.currency('$', 5)).toBe(null)
  expect(chain.currency('$', 'ahoy!')).toBe(null)
  expect(chain.currency('$', '€10')).toBe(null)
  expect(chain.currency('$', '$10')).toBe(10)
  expect(chain.currency('€', '€10')).toBe(10)

  expect(chain.gte(10, '10')).toBe(null)
  expect(chain.gte(10, 5)).toBe(null)
  expect(chain.gte(10, 10)).toBe(10)
  expect(chain.gte(10, 15)).toBe(15)
})

it('returns the result of the last step if all steps returns non-null values', () => {
  const chain = buildTest()
  
  expect(chain.number.positive(5)).toBe(10)
  expect(chain.number.positive(-5)).toBe(null)
  expect(chain.number.positive('abc')).toBe(null)
  
  expect(chain.positive.number(5)).toBe(10)
  expect(chain.positive.number(-5)).toBe(null)
  expect(chain.positive.number('abc')).toBe(null)

  expect(chain.currency('$').gte(30, 45)).toBe(null)
  expect(chain.currency('$').gte(30, '$64')).toBe(64)
  expect(chain.currency('$').gte(30, 15)).toBe(null)
  expect(chain.currency('$').gte(30, '15')).toBe(null)
  expect(chain.currency('$').gte(30, undefined)).toBe(null)

  expect(chain.gte(22).currency('€', 40)).toBe(null)
  expect(chain.gte(22).currency('€', '€40')).toBe(null)
  expect(chain.gte(22).currency('€', 20)).toBe(null)
  expect(chain.gte(22).currency('€', '25')).toBe(null)
  expect(chain.gte(22).currency('€', {})).toBe(null)

  expect(chain.number.gte(10, 15)).toBe(30)
  expect(chain.number.gte(10, 5)).toBe(10)
  expect(chain.number.gte(10, '15')).toBe(null)
  expect(chain.number.gte(10, [])).toBe(null)
  
  expect(chain.gte(10).number(15)).toBe(30)
  expect(chain.gte(10).number(5)).toBe(null)
  expect(chain.gte(10).number('15')).toBe(null)
  expect(chain.gte(10).number([])).toBe(null)

  expect(chain.number.positive.gte(15).currency('$', 44)).toBe(null)
  expect(chain.number.positive.gte(15).currency('$', '$44')).toBe(null)

  expect(chain.currency('$').number.positive.gte(10, 5)).toBe(null)
  expect(chain.currency('$').number.positive.gte(10, '$2')).toBe(null)
  expect(chain.currency('$').number.positive.gte(10, '$5')).toBe(10)
})

it('returns fallback value when there is no input value', () => {
  const chain = buildTest()

  expect(chain.infinite()).toEqual(Infinity)
  expect(chain.infinite(5)).toEqual(null)
})