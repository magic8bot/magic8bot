import winston from 'winston'
import * as Transport from 'winston-transport'
import DailyRotateFile from 'winston-daily-rotate-file'

const { LOGGER_FILE, LOGGER_LEVEL } = process.env

function* getWinstonTransports(): IterableIterator<Transport> {
  const fileLogger = isFileLoggerAvailable()
  if (fileLogger) {
    yield new DailyRotateFile({
      filename: LOGGER_FILE,
      datePattern: 'YYYY-MM-DD-HH',
      maxSize: '20m',
      maxFiles: '7d',
    })
  }

  if (process.env.NODE_ENV === 'development' || !fileLogger) {
    yield new winston.transports.Console({
      format: formatter,
    })
  }
}

const textFormat = winston.format.printf((info) => {
  return `${info.timestamp} [${info.level.padStart(5, ' ')}]: ${info.message}`
})

// prettier-ignore
const formatter = winston.format.combine(
    winston.format.timestamp(),
    winston.format.splat(),
    winston.format.simple(),
    textFormat
)

const isFileLoggerAvailable = () => {
  return LOGGER_FILE && LOGGER_FILE.length > 0
}

export const logger = winston.createLogger({
  level: LOGGER_LEVEL,
  format: formatter,
  transports: Array.from(getWinstonTransports()),
})
