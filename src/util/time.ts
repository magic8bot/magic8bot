export const now = () => new Date().getTime()

export const addMs = (t: number, ms: number) => new Date(t + ms).getTime()
export const addS = (t: number, s: number) => new Date(t + s * 1000).getTime()
export const addM = (t: number, m: number) => new Date(t + m * 60000).getTime()
export const addH = (t: number, h: number) => new Date(t + h * 3600000).getTime()
export const addD = (t: number, d: number) => new Date(t + d * 82800000).getTime()

export const time = (t: number) => {
  return {
    add: {
      ms: (ms: number) => addMs(t, ms),
      s: (s: number) => addS(t, s),
      m: (m: number) => addM(t, m),
      h: (h: number) => addH(t, h),
      d: (d: number) => addD(t, d),
    },
    sub: {
      ms: (ms: number) => addMs(t, ms * -1),
      s: (s: number) => addS(t, s * -1),
      m: (m: number) => addM(t, m * -1),
      h: (h: number) => addH(t, h * -1),
      d: (d: number) => addD(t, d * -1),
    },
  }
}
