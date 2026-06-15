/// <reference types="vite/client" />

declare global {
  const __APP_VERSION__: string

  const __BUILD_INFO__: {
    version: string
    branch: string
    commit: string
    commitDate: string
    buildDate: string
  }

  // `interface` is required here: augmenting the DOM lib's global `Window`
  // relies on TypeScript's declaration merging, which only works with
  // interfaces. A `type` alias would shadow the built-in Window and break it.
  // eslint-disable-next-line ts/consistent-type-definitions
  interface Window {
    /**
     * Build metadata (version, branch, commit, build date) exposed on the
     * global window object so it survives Terser's production console
     * stripping. Set once during app bootstrap in `main.tsx`.
     */
    __MDK_BUILD__: typeof __BUILD_INFO__
  }
}

declare module '*.module.css' {
  const classes: { [key: string]: string }
  export default classes
}

export {}
