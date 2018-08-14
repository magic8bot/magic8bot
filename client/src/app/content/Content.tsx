import './content.styl'

import React, { Component } from 'react'
import { inject, observer } from 'mobx-react'
import { RouterStore } from 'mobx-react-router'

import { Exchange } from '../actions/Exchange'
import { Card } from '../ui'

interface Props {
  routing?: RouterStore
}

@inject('routing')
@observer
export class Content extends Component<Props> {
  public render() {
    const { location } = this.props.routing
    return (
      <section className="content">
        <Card>Current pathname: {location.pathname}</Card>
        <Exchange />
        <Exchange />
      </section>
    )
  }
}
