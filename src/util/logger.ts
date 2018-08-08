import winston from 'winston'
import { magic8bot } from '../conf'

const textFormat = winston.format.printf((info) => {
    return `${info.timestamp} [${info.level.padStart(5, ' ')}]: ${info.message}`
})

const formatter = winston.format.combine(
    winston.format.timestamp(),
    winston.format.splat(),
    winston.format.simple(),
    textFormat
)

export const logger = winston.createLogger({
    level: magic8bot.loggerLevel,
    format: formatter,
    transports: [
        new winston.transports.File({ filename: magic8bot.loggerFile }),
    ],
})

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: formatter,
    }))
}
