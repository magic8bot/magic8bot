export const randomInRange = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

export const randomChoice = (choices: any[]) => choices[randomInRange(0, choices.length - 1)]
