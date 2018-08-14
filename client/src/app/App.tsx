import './app.styl'

import React, { Component } from 'react'
import { createBrowserHistory } from 'history'
import { Provider } from 'mobx-react'
import { RouterStore, syncHistoryWithStore } from 'mobx-react-router'
import { Router } from 'react-router'

import { Header } from './header'
import { Sidebar } from './sidebar'
import { Content } from './content'
import { ErrorBox } from './footer'

const browserHistory = createBrowserHistory()
const routing = new RouterStore()

const history = syncHistoryWithStore(browserHistory, routing)

export class App extends Component {
  constructor(props) {
    super(props)
  }

  public render() {
    return (
      <Provider routing={routing}>
        <Router history={history}>
          <div>
            <Header />
            <main className="main">
              <Sidebar />
              <Content />
            </main>
            <ErrorBox />
          </div>
        </Router>
      </Provider>
    )
  }
}
