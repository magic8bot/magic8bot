const fromCamel = (str: string) => {
  const parts = str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .split('_')

  return fromParts(parts)
}

const fromSplit = (split: string) => (str: string) => {
  const parts = str.split(split)
  return fromParts(parts)
}

const fromSnake = fromSplit('_')
const fromKebab = fromSplit('-')

const fromParts = (parts) => ({
  toSnake: () => toSnake(parts),
  toCamel: () => toCamel(parts),
  toKebab: () => toKebab(parts),
})

const toJoin = (join: string) => (parts: string[]) => parts.join(join)

const toSnake = toJoin('_')
const toKebab = toJoin('-')

const toCamel = (parts: string[]) => {
  const [first, ...rest] = parts
  return [first, ...rest.map((str) => `${str[0].toUpperCase()}${str.slice(1)}`)].join('')
}

const detectCase = (str: string) => {
  if (/_/.test(str)) return 'snake'
  if (/-/.test(str)) return 'kebab'
  if (/[A-Z]/.test(str)) return 'camel'
}

const fromAny = (str: string) => {
  switch (detectCase(str)) {
    case 'snake':
      return fromSnake(str)
    case 'camel':
      return fromCamel(str)
    case 'kebab':
      return fromKebab(str)
  }
}

export const fromCamelToSnake = (str: string) => fromCamel(str).toSnake()
export const fromCamelToKebab = (str: string) => fromCamel(str).toKebab()

export const fromSnakeToCamel = (str: string) => fromSnake(str).toCamel()
export const fromSnakeToKebab = (str: string) => fromSnake(str).toKebab()

export const fromKebabToCamel = (str: string) => fromKebab(str).toCamel()
export const fromKebabToKebab = (str: string) => fromKebab(str).toKebab()

export const fromAnyToCamel = (str: string) => fromAny(str).toCamel()
export const fromAnyToSnake = (str: string) => fromAny(str).toSnake()
export const fromAnyToKebab = (str: string) => fromAny(str).toKebab()
