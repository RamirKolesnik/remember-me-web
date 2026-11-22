# remember.me — web

Frontend of remember.me: a wall of 1,000,000 cells where anyone can claim a frame with a photo and a note, kept forever.

Live: https://ramirkolesnik.github.io/remember-me-web/

## Stack

- Nuxt 4 (Vue 3, Composition API, TypeScript)
- The wall is drawn on a 2D canvas (`app/components/WallCanvas.vue`): pan, zoom, pinch, tap
- Wall rules (zones, prices, the heart, link check) live in `app/shared/wall.ts`; the API keeps the same rules and is the source of truth for prices

## Sharing

After payment, `/immortalize/done` is the Share screen: the frame's 9:16 story card from the API (`GET /frames/:id/story.jpg`), the system share sheet (Web Share API), a download button and the frame's link `/f/:id`. On GitHub Pages `/f/:id` is served by the SPA fallback and opens the wall on the frame.

## Run locally

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # rules of the wall
```

Until `NUXT_PUBLIC_API_BASE` points at the API, the site runs on deterministic demo data (`app/composables/useWall.ts`).

## Deploy

Every push to `main` builds a static site (`nuxt generate`) and publishes it to GitHub Pages via `.github/workflows/deploy.yml`. Pull requests are built and tested the same way but not deployed.

The backend lives in a separate repository: `RamirKolesnik/remember-me-api`.
