import './app.styl'

import React, { Component } from 'react'

import { Header } from './header'
import { Sidebar } from './sidebar'
import { Content } from './content'
import { ErrorBox } from './footer'

export class App extends Component {
  constructor(props) {
    super(props)
  }

  public render() {
    return (
      <div>
        <Header />
        <main className="main">
          <Sidebar />
          <Content />
        </main>
        <ErrorBox />
      </div>
    )
  }
}
