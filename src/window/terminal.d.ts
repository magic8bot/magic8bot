declare module 'terminal-kit' {
  export var terminal: Terminal

  interface Terminal {
    (...values: any[]): Terminal
    //Properties
    width: number
    height: number

    //Foreground colors
    defaultColor: Terminal
    black: Terminal
    red: Terminal
    green: Terminal
    yellow: Terminal
    blue: Terminal
    magenta: Terminal
    cyan: Terminal
    white: Terminal
    brightBlack: Terminal
    gray: Terminal
    brightRed: Terminal
    brightGreen: Terminal
    brightYellow: Terminal
    brightBlue: Terminal
    brightMagenta: Terminal
    brightCyan: Terminal
    brightWhite: Terminal
    color: Terminal
    darkColor: Terminal
    brightColor: Terminal
    color256: Terminal
    colorRgb: Terminal
    colorRgbHex: Terminal
    colorGrayscale: Terminal

    //Background colors
    bgDefaultColor: Terminal
    bgBlack: Terminal
    bgRed: Terminal
    bgGreen: Terminal
    bgYellow: Terminal
    bgBlue: Terminal
    bgMagenta: Terminal
    bgCyan: Terminal
    bgWhite: Terminal
    bgDarkColor: Terminal
    bgBrightBlack: Terminal
    bgGray: Terminal
    bgBrightRed: Terminal
    bgBrightGreen: Terminal
    bgBrightYellow: Terminal
    bgBrightBlue: Terminal
    bgBrightMagenta: Terminal
    bgBrightCyan: Terminal
    bgColor: Terminal
    bgBrightWhite: Terminal
    bgBrightColor: Terminal
    bgColor256: Terminal
    bgColorRgb: Terminal
    bgColorRgbHex: Terminal
    bgColorGrayscale: Terminal

    //Styles
    styleReset: Terminal
    bold: Terminal
    dim: Terminal
    italic: Terminal
    underline: Terminal
    blink: Terminal
    inverse: Terminal
    hidden: Terminal
    strike: Terminal

    //Moving the Cursor
    saveCursor: Terminal
    restoreCursor: Terminal
    up: Terminal
    down: Terminal
    right: Terminal
    left: Terminal
    nextLine: Terminal
    previousLine: Terminal
    column: Terminal
    scrollUp: Terminal
    scrollDown: Terminal
    scrollingRegion: Terminal
    resetScrollingRegion: Terminal
    moveTo: Terminal
    move: Terminal
    hideCursor: Terminal
    tabSet: Terminal
    tabClear: Terminal
    tabClearAll: Terminal
    forwardTab: Terminal
    backwardTab: Terminal

    //Editing the Screen
    clear: Terminal
    eraseDisplayBelow: Terminal
    eraseDisplayAbove: Terminal
    eraseDisplay: Terminal
    eraseScrollback: Terminal
    eraseLineAfter: Terminal
    eraseLineBefore: Terminal
    eraseLine: Terminal
    eraseArea: Terminal
    insertLine: Terminal
    deleteLine: Terminal
    insert: Terminal
    delete: Terminal
    backDelete: Terminal
    // scrollUp: Terminal;
    // scrollDown: Terminal;
    alternateScreenBuffer: Terminal

    //Input/Output
    requestCursorLocation: Terminal
    requestScreenSize: Terminal
    requestColor: Terminal
    applicationKeypad: Terminal

    //Internal input/output (do not use directly, use grabInput() instead)
    mouseButton: Terminal
    mouseDrag: Terminal
    mouseMotion: Terminal
    mouseSGR: Terminal
    focusEvent: Terminal

    //Operating System
    cwd: Terminal
    windowTitle: Terminal
    iconName: Terminal
    notify: Terminal

    //Modifiers
    error: Terminal
    str: Terminal
    noFormat: Terminal
    markupOnly: Terminal
    bindArgs: Terminal

    //Misc
    reset: Terminal
    bell: Terminal
    setCursorColor: Terminal
    setCursorColorRgb: Terminal
    resetCursorColorRgb: Terminal
    setDefaultColorRgb: Terminal
    resetDefaultColorRgb: Terminal
    setDefaultBgColorRgb: Terminal
    resetDefaultBgColorRgb: Terminal
    setHighlightBgColorRgb: Terminal
    resetHighlightBgColorRgb: Terminal

    // highlevel
    fullscreen(enable?: boolean): void
    grabInput(enable?: boolean): void
    getCursorLocation(callback: (error: any, x: number, y: number) => void): void
    on(event: string, callback: (...args: any[]) => void): void
  }

  export var ScreenBuffer: ScreenBufferConstructor

  interface ScreenBuffer {
    dst: Terminal | ScreenBuffer
    x: number
    y: number
    blending: boolean
    fill(options?: { attr: AttributeObject; char: string }): void
    clear(): void
    put(opts: putOpts, str: string, ...values: any[]): void
    get(opts?: { x?: number; y?: number }): { char: string; attr: AttributeObject }
    resize(fromRect?: fromRect): boolean
    draw(opts?: drawOpts): void
    drawCursor(opts?: { dst: Terminal | ScreenBuffer }): void
    moveTo(x: number, y: number): void
    vScroll(offset: number, drawToTerminal?: boolean): void
    dumpChars(): string
    dump(): string
    saveSync(filepath: string): void
  }

  interface putOpts {
    x?: number
    y?: number
    attr: AttributeObject | number
    wrap?: boolean
    direction?: 'right' | 'left' | 'up' | 'down' | 'none' | null
    dx?: number
    dy?: number
  }

  type fromRect = RectCreateOpts | Rect

  interface drawOpts {
    dst: Terminal | ScreenBuffer
    x: number
    y: number
    srcClipRect?: Rect
    dstClipRect?: Rect
    blending?: boolean
    delta?: boolean
    wrap?: boolean | 'x' | 'y'
    tile?: boolean
  }

  interface ScreenBufferCreateOptions {
    width?: number
    height?: number
    dst?: Terminal | ScreenBuffer
    x?: number
    y?: number
    blending?: boolean
    wrap?: boolean
    noFill?: boolean
  }

  interface ScreenBufferCreateFromStringOptions {
    attr: AttributeObject
    transparencyChar?: string
    transparencyType?: number
  }

  interface AttributeObject {
    color?: number | string
    defaultColor?: boolean
    bgColor?: number | string
    bgDefaultColor?: boolean
    bold?: boolean
    dim?: boolean
    italic?: boolean
    underline?: boolean
    blink?: boolean
    inverse?: boolean
    hidden?: boolean
    strike?: boolean
    transparency?: boolean
    fgTransparency?: boolean
    bgTransparency?: boolean
    styleTransparency?: boolean
    charTransparency?: boolean
  }

  interface ScreenBufferLoadImageOptions {
    term: Terminal
    shrink?: {
      width: number
      height: number
    }
  }

  interface ScreenBufferConstructor {
    create(opts: ScreenBufferCreateOptions): ScreenBuffer
    createFromString(opts: ScreenBufferCreateFromStringOptions, str: string): ScreenBuffer
    loadImage(url: string, callback: (err: any, image: ScreenBuffer) => void): void
    loadImage(url: string, opts: ScreenBufferLoadImageOptions, callback: (err: any, image: ScreenBuffer) => void): void
    attr2object(attrFlags: number): Record<string, any>
    object2attr(attrObject: Record<string, any>): number
    loadSync(filepath: string): ScreenBuffer
  }

  export var React: RectConstructor

  interface Rect {
    readonly xmin: number
    readonly xmax: number
    readonly ymin: number
    readonly ymax: number
    readonly width: number
    readonly height: number
    readonly isNull: boolean
  }

  interface RectConstructor {
    create(xmin: number, xmax: number, ymin: number, ymax: number): Rect
    create(opts: RectCreateOpts | Rect | Terminal | ScreenBuffer | TextBuffer): Rect
    wrappingRect(
      opts?: WrappingRectOpts
    ): [Blitter] | [Blitter, Blitter] | [Blitter, Blitter, Blitter] | [Blitter, Blitter, Blitter, Blitter]
    set(opts: Region): void
    clip(dstRect: Rect, offsetX?: number, offsetY?: number, dstClipping?: boolean)
  }

  interface Region {
    xmin: number
    ymin: number
    xmax: number
    ymax: number
  }

  type RectCreateOpts = Region | { width: number; height: number; x?: number; y?: number }

  interface WrappingRectOpts {
    srcRect: Rect
    dstRect: Rect
    offsetX: number
    offsetY: number
    wrapOnly?: string
  }

  interface Blitter {
    srcRect: Rect
    dstRect: Rect
    offsetX: number
    offsetY: number
  }

  var TextBuffer: TextBufferConstructor

  interface TextBuffer {
    x: number
    y: number
    getText(): string
    setText(str: string): void
    getHidden(): boolean
    setHidden(state: boolean): void
    getContentSize(): { width: number; height: number }
    setEmptyCellAttr(attr: AttributeObject | number): void
    setAttrAt(attr: AttributeObject, x: number, y: number): void
    setAttrCodeAt(attr: AttributeObject, x: number, y: number): void
    setAttrRegion(attr: AttributeObject, region: Region): void
    setAttrCodeRegion(attr: AttributeObject, region: Region): void
    getMisc(x: number, y: number): any
    moveToColumn(x: number): void
    moveToLine(y: number): void
    moveToRow(y: number): void
    move(x: number, y: number): void
    moveUp(): void
    moveDown(): void
    moveLeft(): void
    moveRight(): void
    moveForward(justSkipNullChecks: boolean): void
    moveBackward(justSkipNullChecks: boolean): void
    moveToEndOfLine(): void
    moveInBound(ignoreCx: boolean): void
    insert(str: string, attr?: AttributeObject | number)
    delete(n?: number): void
    backDelete(n?: number): void
    newLine(): void
    joinLine(): void
    iterate(opts: { finalCall: boolean }, callback: (cellData: CellData) => void): void
    draw(opts?: drawOpts): void
    drawCursor(opts?: { dst: Terminal | ScreenBuffer }): void
    load(filepath: string, callback: (err?: any) => void): void
    save(filepath: string, callback: (err?: any) => void): void
  }

  interface CellData {
    offset: number
    x: number
    y: number
    text: string
    attr: number
    misc: Record<string, any>
  }

  interface TextBufferConstructor {
    create(opts: TextBufferCreateOpts): TextBuffer
  }

  interface TextBufferCreateOpts {
    dst: ScreenBuffer
    width?: number
    height?: number
    x?: number
    y?: number
    tabWidth?: number
    forceInBound?: number
    hidden?: boolean
    wrap?: boolean
  }
}
