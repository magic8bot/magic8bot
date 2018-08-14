import './error.styl'

import React, { Component } from 'react'
import { inject, observer } from 'mobx-react'
import { ErrorStore } from './error.store'
import { ErrorItem } from './ErrorItem'

interface Props {
  errorStore?: ErrorStore
}

@inject('errorStore')
@observer
export class ErrorBox extends Component<Props> {
  constructor(props) {
    super(props)
  }

  public render() {
    return <div className="error-box">{this.renderErrors()}</div>
  }

  private renderErrors() {
    const { errors } = this.props.errorStore

    return errors.map((error, idx) => <ErrorItem key={idx} error={error} />)
  }
}
