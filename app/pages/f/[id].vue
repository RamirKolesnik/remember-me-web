<script setup lang="ts">
// Public link of a frame: /f/123 opens the wall on that frame.
// GitHub Pages has no server, so this page is reached through the SPA fallback (404.html).
const route = useRoute()
const id = Number(route.params.id)
await navigateTo(Number.isInteger(id) && id > 0 ? { path: '/', query: { frame: String(id) } } : '/', { replace: true })
</script>

<template>
  <div />
</template>
