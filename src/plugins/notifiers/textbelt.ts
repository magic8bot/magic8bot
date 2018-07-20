import request from 'request'

export const textbelt = (config) => {
  const textbelt = {
    pushMessage(title, message) {
      const postData = { number: config.phone, message: title + ': ' + message, key: config.key }

      function callback(error) {
        if (error) {
          console.log('Error happened: ' + error)
        }
      }

      const options = {
        method: 'POST',
        url: 'https://textbelt.com/text',
        json: postData,
      }

      request(options, callback)
    },
  }
  return textbelt
}
