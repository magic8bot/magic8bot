export const asyncTimeout = async (fn: () => void, ms: number) => {
  await sleep(ms)
  return fn()
}

export const sleep = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const asyncWrap = async <T>(promise: Promise<T>): Promise<[Error, T]> => {
  try {
    const result = await promise

    return [null, result]
  } catch (e) {
    return [e, null]
  }
}

export const asyncNextTick = <T>(promise: Promise<T>) => new Promise<T>((resolve) => process.nextTick(async () => resolve(await promise)))
