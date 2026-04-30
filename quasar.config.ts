import { defineConfig } from '#q-app/wrappers';

export default defineConfig(() => ({
  boot: ['supabase'],

  css: ['app.scss'],

  extras: ['roboto-font', 'material-icons', 'material-symbols-rounded'],

  build: {
    target: {
      browser: ['es2022', 'edge91', 'firefox90', 'chrome91', 'safari15'],
      node: 'node20',
    },
    typescript: {
      strict: true,
      vueShim: true,
    },
    vueRouterMode: 'history',
  },

  devServer: {
    open: false,
    port: 9000,
  },

  framework: {
    config: {
      brand: {
        primary: '#1976D2',
        secondary: '#26A69A',
        accent: '#9C27B0',
        dark: '#1D1D1D',
        positive: '#21BA45',
        negative: '#C10015',
        info: '#31CCEC',
        warning: '#F2C037',
      },
      notify: { position: 'top', timeout: 2500 },
    },
    iconSet: 'material-icons',
    lang: 'ko-KR',
    plugins: ['Notify', 'Dialog', 'LoadingBar'],
  },

  animations: [],

  pwa: {
    workboxMode: 'GenerateSW',
    injectPwaMetaTags: true,
    swFilename: 'sw.js',
    manifestFilename: 'manifest.json',
    useCredentialsForManifestTag: false,
    manifest: {
      name: 'VocaFlow',
      short_name: 'VocaFlow',
      description: '수능 영어 라이트너 단어장',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#ffffff',
      theme_color: '#1976D2',
      lang: 'ko-KR',
      icons: [
        {
          src: 'icons/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: 'icons/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    },
  },
}));
