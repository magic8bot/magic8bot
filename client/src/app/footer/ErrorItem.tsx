import './error-item.styl'

import React from 'react'

interface Props {
  error: string
}

export const ErrorItem = ({ error }: Props) => {
  return <div className="error-item">{error}</div>
}
