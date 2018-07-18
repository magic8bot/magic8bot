/// <reference types="@types/blessed" />

declare module 'blessed-contrib' {
  import blessed from 'blessed'

  export namespace ContribWidgets {
    interface Border extends Filter<blessed.Widgets.Border, 'fg' | 'bg'> {
      fg?: string | number
      bg?: string | number
    }

    interface LogOptions extends Filter<blessed.Widgets.ElementOptions, 'border'> {
      border: Border | 'line' | 'bg'
    }

    interface LogElement extends blessed.Widgets.BlessedElement {
      log(str: string): void
    }
  }

  export function log(options?: ContribWidgets.LogOptions): ContribWidgets.LogElement
}
