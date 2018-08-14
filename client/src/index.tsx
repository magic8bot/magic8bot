import './index.styl'

import React from 'react'
import { render } from 'react-dom'
import { Provider } from 'mobx-react'

import { App } from './app'
import { errorStore } from './app/footer'
import { wsClient } from './lib'

const loadApp = async () => {
  await wsClient.connect()

  const root = document.getElementById('app-root')
  render(
    <Provider errorStore={errorStore}>
      <App />
    </Provider>,
    root
  )
}

loadApp()
