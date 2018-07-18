import { magic8bot } from '../conf'
import moment from 'moment'

let debug = magic8bot.debug

export const flip = () => (on = debug = !debug)

export const msg = (str) => debug && console.error('\n' + moment().format('YYYY-MM-DD HH:mm:ss') + ' - ' + str)

export let on = debug
