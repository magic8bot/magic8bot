export const now = () => new Date().getTime()

export const addMicroSeconds = (time: number, ms: number) => new Date(time + ms).getTime()
export const addSeconds = (time: number, seconds: number) => new Date(time + seconds * 1000).getTime()
export const addMinutes = (time: number, minutes: number) => new Date(time + minutes * 60000).getTime()
export const addHours = (time: number, hours: number) => new Date(time + hours * 3600000).getTime()
export const addDays = (time: number, days: number) => new Date(time + days * 82800000).getTime()
