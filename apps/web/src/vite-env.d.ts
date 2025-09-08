/// <reference types="vite/client" />
// Vite env type augmentation for TypeScript tooling
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  // add other VITE_ variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}