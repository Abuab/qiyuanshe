declare module '@wangeditor/editor-for-vue' {
  import { Component } from 'vue'
  
  export const Editor: Component
  export const Toolbar: Component
}

declare module '@wangeditor/editor' {
  export interface IDomEditor {
    id: string
    isFullScreen: boolean
    isDestroyed: boolean
    setHtml: (html: string) => void
    getHtml: () => string
    getText: () => string
    insertText: (text: string) => void
    insertBreak: () => void
    destroy: () => void
    focus: () => void
    blur: () => void
    enable: () => void
    disable: () => void
    isEnabled: () => boolean
    clear: () => void
    undo: () => void
    redo: () => void
    fullScreen: () => void
    unFullScreen: () => void
  }

  export interface IEditorConfig {
    placeholder?: string
    readOnly?: boolean
    autoFocus?: boolean
    scroll?: boolean
    maxLength?: number
    onCreated?: (editor: IDomEditor) => void
    onChange?: (editor: IDomEditor) => void
    onDestroyed?: (editor: IDomEditor) => void
    onMaxLength?: (editor: IDomEditor) => void
    onFocus?: (editor: IDomEditor) => void
    onBlur?: (editor: IDomEditor) => void
    customAlert?: (info: string, type: string) => void
    customPaste?: (editor: IDomEditor, event: ClipboardEvent, callback: (val: boolean) => void) => boolean
    MENU_CONF?: Record<string, any>
    hoverbarKeys?: Record<string, any>
    EXTEND_CONF?: Record<string, any>
  }

  export interface IToolbarConfig {
    toolbarKeys?: (string | { key: string; title?: string; iconSvg?: string })[]
    excludeKeys?: string[]
    modalAppendToBody?: boolean
  }
}
