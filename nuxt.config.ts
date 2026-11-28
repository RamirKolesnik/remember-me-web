// https://nuxt.com/docs/api/configuration/nuxt-config
const baseURL = process.env.NUXT_APP_BASE_URL || '/'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  // flag-icons: SVG flags as CSS classes (fi fi-us); emoji flags do not show on Windows.
  css: ['flag-icons/css/flag-icons.min.css', '~/assets/main.css'],
  app: {
    // GitHub Pages serves the site from /<repo>/; the deploy workflow sets this.
    baseURL,
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'The Living Wall — every new face is a heartbeat',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'description', content: 'A living wall of one million cells with a beating heart. Put your photo and a note on it, forever.' },
        { name: 'theme-color', content: '#0B0709' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: `${baseURL}favicon.svg` },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600&display=swap' },
      ],
    },
  },
  runtimeConfig: {
    public: {
      // Empty until the API is deployed: the site then runs on demo data.
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '',
    },
  },
})
