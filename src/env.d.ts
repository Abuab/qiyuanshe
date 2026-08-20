/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_STATIC_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '@/subpkg-pages/mp_ecard_sdk/main' {
  export function initEid(baseUrl?: string, envVersion?: string, backupUrl?: string): void
  export function startEid(options: unknown): void
}
