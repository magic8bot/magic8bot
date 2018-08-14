import './content.styl'

import React, { Component } from 'react'
import { Exchange } from '../actions/Exchange'

export class Content extends Component {
  public render() {
    return (
      <section className="content">
        <Exchange />
        <Exchange />
      </section>
    )
  }
}
