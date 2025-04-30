import { expect, it } from 'vitest'
import map from '../src/map'

it('applies plain decorators to the input', () => {
  const addOne = (input: number) => ++input
  const double = (input: number) => input * 2
  const chain = map({ addOne, double }) 
  expect(chain.addOne(5)).toBe(6)
  expect(chain.addOne.double(5)).toBe(12)
  expect(chain.double.addOne(5)).toBe(11)
})

it('applies factory decorators to the input', () => {
  const decorator = map({
    add: (val) => (input: number) => input + val,
    multiply: (val) => (input: number) => input * val,
  }) 
  expect(decorator.add(2, 8)).toBe(10)
  expect(decorator.add(2).multiply(3, 4)).toBe(18)
})

it('applies a mixed set of decorators to the input', () => {
  const decorator = map({
    add: (val) => (input: number) => input + val,
    addOne: (input) => ++input,
    double: (input) => input * 2,
    multiply: (val) => (input: number) => input * val
  })
  expect(decorator.addOne(5)).toBe(6)
  expect(decorator.add(2, 8)).toBe(10)
  expect(decorator.addOne.multiply(3).double.add(10, 8)).toBe(64)
})

it('applies decorators to the default input', () => {
  const decorator = map({
    add: (val: number) => (input = 5) => input + val,
    addOne: (input: number = 20) => input + 1,
    double: (input: number = 6) => input * 2,
    multiply: (val: number) => (input = 8) => input * val
  })
  expect(decorator.add(5)()).toBe(10)
  expect(decorator.addOne()).toBe(21)
  expect(decorator.add(4).double.addOne.multiply(1)()).toBe(19)
})