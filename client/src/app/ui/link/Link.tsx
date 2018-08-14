import './link.styl'

import React from 'react'
import { inject, observer } from 'mobx-react'
import { RouterStore } from 'mobx-react-router'

interface Props extends React.Props<any> {
  to: string
  routing?: RouterStore
}

export const Link = inject('routing')(
  observer(({ to, routing, children }: Props) => {
    const { pathname } = routing.location
    const isActive = pathname === to
    console.log({ pathname, to })
    return (
      <a className={`link ${isActive ? 'active' : ''}`} onClick={() => routing.push(to)}>
        {children}
      </a>
    )
  })
)
