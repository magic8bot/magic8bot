import { window } from './window'

window.draw()

setInterval(() => {}, 500)

// import semver from 'semver'

// import { zenbot } from './conf'

// import { Conf } from '@zbTypes'
// import { mongoService } from './services/mongo.service'

// import { Core } from './engine'

// const checkSharePercent = ({ exchanges }: Conf) => {
//   exchanges.forEach(({ name, options: { strategies } }) => {
//     const share = strategies.reduce((acc, { share }) => (acc += share), 0)
//     if (share > 1) throw new Error(`Exchange ${name} over 100% share at ${share}`)
//   })
// }

// if (semver.gt('10.0.0', process.versions.node)) {
//   console.error('You are running a node.js version older than 10.x.x, please upgrade via https://nodejs.org/en/')
//   process.exit(1)
// }

// const run = async () => {
//   try {
//     checkSharePercent(zenbot.conf)

//     await mongoService.connect(zenbot.mongo)
//     const trader = new Core(zenbot.conf)
//     await trader.init()
//   } catch (e) {
//     console.error(e)
//     process.exit(1)
//   }
// }

// run()
