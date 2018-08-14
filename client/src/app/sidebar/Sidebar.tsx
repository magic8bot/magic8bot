import './sidebar.styl'

import React, { Component } from 'react'
import { SidebarItem } from './sidebar-item'
import { SidebarHeader } from './sidebar-header'

export class Sidebar extends Component {
  public render() {
    return (
      <aside className="sidebar">
        <SidebarHeader label="Configuration" />
        <SidebarItem label="Exchanges" onClick={() => console.log('clicked')} />
        <SidebarItem label="Strategies" onClick={() => console.log('clicked')} />
        <SidebarItem label="Wallets" onClick={() => console.log('clicked')} />
        <SidebarItem label="Orders" onClick={() => console.log('clicked')} />
      </aside>
    )
  }
}
