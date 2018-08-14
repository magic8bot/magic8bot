import './header.styl'

import React, { Component } from 'react'

export class Header extends Component {
  public render() {
    return (
      <header className="header">
        Magic8bot <small className="small">(developer preview)</small>
      </header>
    )
  }
}
