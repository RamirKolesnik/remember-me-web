<script setup lang="ts">
// Public link of a frame: /f/4812 opens the wall on frame #4,812 (the number
// on its story card). GitHub Pages has no server, so this page is reached
// through the SPA fallback (404.html).
import { parseFrameNumber } from '~/shared/share'

const route = useRoute()
const n = parseFrameNumber(String(route.params.n ?? ''))
await navigateTo(n ? { path: '/', query: { n: String(n) } } : '/', { replace: true })
</script>

<template>
  <div />
</template>
