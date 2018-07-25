import request from 'request'

export const ifttt = (config) => {
  const ifttt = {
    pushMessage(title, message) {
      const postData = { value1: title, value2: message }

      function callback(error) {
        if (error) {
          console.log('Error happened: ' + error)
        }
      }

      const options = {
        method: 'POST',
        url: 'https://maker.ifttt.com/trigger/' + config.eventName + '/with/key/' + config.makerKey,
        json: postData,
      }

      request(options, callback)
    },
  }
  return ifttt
}
