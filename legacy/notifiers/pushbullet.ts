import pusher from 'pushbullet'

export const pushbullet = (config) => {
  const pushbullet = {
    pushMessage(title, message) {
      const pb = new pusher(config.key)
      pb.note(config.deviceID, title, message, (err) => {
        if (err) {
          console.log('error: Push message failed, ' + err)
          return
        }
      })
    },
  }
  return pushbullet
}
