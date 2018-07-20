import Prowl from 'node-prowl'

export const prowl = (config) => {
  const prowl = {
    pushMessage(title, message) {
      const p = new Prowl(config.key)
      p.push(message, title, function(err) {
        if (err) {
          console.log('error: Push message failed, ' + err)
          return
        }
      })
    },
  }
  return prowl
}
