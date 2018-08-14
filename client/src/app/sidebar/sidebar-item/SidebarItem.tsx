import './sidebar-item.styl'

import React from 'react'

export const SidebarItem = ({ label, onClick }) => {
  return (
    <div className="sidebar-item" onClick={onClick}>
      {label}
    </div>
  )
}
