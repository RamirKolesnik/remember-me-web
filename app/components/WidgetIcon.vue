<script setup lang="ts">
// The icon of a wall widget: on the phone's round buttons and on the tab of a
// widget slid off the screen.
defineProps<{ icon: 'search' | 'feed' | 'stats' | 'map' | 'globe'; size?: number }>()
</script>

<template>
  <svg :width="size ?? 20" :height="size ?? 20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <template v-if="icon === 'search'"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></template>
    <template v-else-if="icon === 'feed'"><path d="M3 12h4l2-5 4 10 2-5h6" /></template>
    <template v-else-if="icon === 'globe'"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" /></template>
    <template v-else-if="icon === 'stats'"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></template>
    <template v-else><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" /><path d="M9 4v14M15 6v14" /></template>
  </svg>
</template>
