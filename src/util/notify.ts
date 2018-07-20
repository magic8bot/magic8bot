export const notify = (conf) => {
  const activeNotifiers = []
  for (const notifier in conf.notifiers) {
    if (conf.notifiers[notifier].on) {
      activeNotifiers.push(require(`../plugins/notifiers/${notifier}`).default(conf.notifiers[notifier]))
    }
  }

  return {
    pushMessage(title, message) {
      if (conf.debug) {
        console.log(`${title}: ${message}`)
      }

      activeNotifiers.forEach((notifier) => {
        if (conf.debug) {
          console.log(`Sending push message via ${notifier}`)
        }
        notifier.pushMessage(title, message)
      })
    },
  }
}
