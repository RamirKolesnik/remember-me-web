# remember-me-web

Frontend of remember.me. The product brief lives in the claude.ai project "remember.me" (`claude/brief.md`).

- Nuxt 4, `app/` is the source dir. Vue 3 Composition API with `<script setup lang="ts">` only.
- No UI framework, no Tailwind: styles are scoped CSS plus tokens in `app/assets/main.css`.
- Wall rules are in `app/shared/wall.ts` and must stay identical to `src/domain/wall.ts` in `remember-me-api`. Change both together, with tests (`npm test`).
- The site is static (GitHub Pages). Do not add server routes; everything server-side belongs to the API repo.
- UI copy is English.
