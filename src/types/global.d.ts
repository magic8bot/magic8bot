declare module '*.json' {
  const value: any
  export default value
}

type FilterKeys<T, K extends keyof T> = { [P in keyof T]: P extends K ? never : P }[keyof T]
type Filter<T, K extends keyof T> = Pick<T, FilterKeys<T, K>>
