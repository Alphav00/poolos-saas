// The Componentia bundle is a plain script that reads window.React when it
// runs (src/vendor/componentia/README.md). This module runs first because
// componentia.ts imports it before the bundle; modules run in import order.
import React from 'react'
import * as ReactDOM from 'react-dom/client'

declare global {
  interface Window {
    React: typeof React
    ReactDOM: typeof ReactDOM
    Componentia: Record<string, React.ComponentType<Record<string, unknown>>>
  }
}

window.React = React
window.ReactDOM = ReactDOM
