import './sidebar.styl'

import React, { Component } from 'react'
import { Route } from 'react-router'

import { SidebarItem } from './sidebar-item'
import { SidebarHeader } from './sidebar-header'
import { Link } from '../ui'

export class Sidebar extends Component {
  public render() {
    return (
      <aside className="sidebar">
        <SidebarHeader label="Main" />
        <Link to="/dashboard">
          <SidebarItem label="Dashboard" onClick={() => console.log('clicked')} />
        </Link>
        <SidebarHeader label="Settings" />
        <Link to="/settings/exchanges">
          <SidebarItem label="Exchanges" onClick={() => console.log('clicked')} />
        </Link>
        <Link to="/settings/strategies">
          <SidebarItem label="Strategies" onClick={() => console.log('clicked')} />
        </Link>
        <Link to="/settings/wallets">
          <SidebarItem label="Wallets" onClick={() => console.log('clicked')} />
        </Link>
      </aside>
    )
  }
}
