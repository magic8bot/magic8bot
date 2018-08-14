import React, { Component } from 'react'
import { observable, action } from 'mobx'
import { observer } from 'mobx-react'

interface Props {
  initValue: string
  label: string
  onChange: (value: string) => void
}

interface State {
  value: string
}

@observer
export class Input extends Component<Props, State> {
  @observable
  public value: string = this.props.initValue

  public render() {
    return (
      <div>
        <label>{this.props.label}</label>
        <input type="text" value={this.value} onChange={this.handleChange} />
      </div>
    )
  }

  @action
  private handleChange = ({ currentTarget: { value } }: React.SyntheticEvent<HTMLInputElement>) => {
    this.value = value
    this.props.onChange(value)
  }
}
