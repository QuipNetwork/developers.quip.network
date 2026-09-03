interface ImportMetaEnv {
  /** Deploy date, stamped in astro.config.mjs when the config module loads. */
  readonly PUBLIC_BUILD_DATE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
