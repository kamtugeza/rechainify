export type RechainifyFn = (input?: any) => any
export type RechainifyFactoryFn = (options?: any) => RechainifyFn
export type RechainifyTupleStep = [string, RechainifyFactoryFn | RechainifyFn]
export type RechainifyTupleSteps = readonly RechainifyTupleStep[]
export type RechainifyRecordSteps = Record<string, RechainifyFactoryFn | RechainifyFn> 
export type RechainifySteps = RechainifyRecordSteps | RechainifyTupleSteps
type RechainifyHandlerBehavior = (sequence: RechainifyFn[], input?: any) => any

const SEQUENCE = Symbol('SEQUENCE')

type WithScenarios<T extends RechainifySteps> = {
  [SEQUENCE]: RechainifyFn[]
} & {
  [K in keyof T]: RechainifyStepHandler<T, K>
}

type WithPlainHandler<Input, Result> = undefined extends Input
  ? { (input?: Input): Result }
  : { (input: Input): Result } 

type WithFactoryHandler<T extends RechainifySteps, Opts, Input, Result> = {
  (options: Opts, input: Input): Result
  (options: Opts): WithScenarios<T> & (
    undefined extends Input ? (input?: Input) => Result : (input: Input) => Result
  )
} 

type WithHandlers<T extends RechainifySteps, C extends keyof T> =
  T[C] extends (a: infer InputOrOpts) => infer FuncOrResult
    ? FuncOrResult extends (c: infer Input) => infer Result
      ? WithFactoryHandler<T, InputOrOpts, Input, Result>
      : WithPlainHandler<InputOrOpts, FuncOrResult>
    : {} 

type RechainifyStepHandler<T extends RechainifySteps, C extends keyof T> = WithScenarios<T> & WithHandlers<T, C>

type ToRecord<T extends RechainifySteps> = T extends RechainifyTupleSteps
  ? T extends readonly [infer Head, ...infer Rest] 
    ? Head extends readonly [infer Name, infer Func]
      ? Name extends string
        ? Func extends RechainifyFactoryFn | RechainifyFn
          ? { [P in Name]: Func } & ToRecord<Rest extends RechainifyTupleSteps ? Rest : []>
          : never
        : never 
      : never
    : {}
  : T

export type RechainifyHandler<T extends RechainifySteps> = WithScenarios<ToRecord<T>> & { <I, R>(input?: I): R }

function toEntries <T extends RechainifySteps>(steps: T): RechainifyTupleSteps {
  return Array.isArray(steps) ? steps : Object.entries(steps)
}

function getStepType (fn: RechainifyFactoryFn | RechainifyFn): number {
  try {
    return Number(typeof fn() === 'function')
  } catch {
    return 0
  }
}

function defineFactoryGetter <T extends RechainifySteps>(
  handler: RechainifyHandler<T>,
  fn: RechainifyFactoryFn
) {
  return () => (...args: [any, any]) => {
    handler[SEQUENCE].push(fn(args[0]))
    const isTail = args.length === 2
    return isTail ? handler(args[1]) : handler
  }
}

function definePlainGetter <T extends RechainifySteps>(
  handler: RechainifyHandler<T>,
  fn: RechainifyFn
) {
  return () => {
    handler[SEQUENCE].push(fn)
    return handler
  }
}

const getters = [definePlainGetter, defineFactoryGetter]

export default function createHandler <T extends RechainifySteps>(
  behavior: RechainifyHandlerBehavior,
  steps: T
): RechainifyHandler<T> {
  const handler = ((input: unknown) => {
    const sequence = handler[SEQUENCE]
    handler[SEQUENCE] = []
    return behavior(sequence, input)
  }) as unknown as RechainifyHandler<T>

  handler[SEQUENCE] = []

  for (const [name, fn] of toEntries(steps)) {
    const type = getStepType(fn)
    Object.defineProperty(handler, name, {
      configurable: true,
      enumerable: true,
      get: getters[type](handler, fn) 
    })
  }

  return handler
}
