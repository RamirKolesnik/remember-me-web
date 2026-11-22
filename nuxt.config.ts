// https://nuxt.com/docs/api/configuration/nuxt-config
const baseURL = process.env.NUXT_APP_BASE_URL || '/'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  css: ['~/assets/main.css'],
  app: {
    // GitHub Pages serves the site from /<repo>/; the deploy workflow sets this.
    baseURL,
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'remember.me — a wall that remembers',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'description', content: 'Claim a frame on a wall of one million cells. Your photo and a note, kept forever.' },
        { name: 'theme-color', content: '#F6F5F1' },
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
