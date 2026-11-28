<script setup lang="ts">
// A pill with the frame's zone, in the zone's colour, next to the Founder badge.
// The heart gets its own red tag.
import { isHeart, zoneOfFrame } from '~/shared/wall'
import { tierOf } from '~/shared/tiers'

const props = defineProps<{ x: number; y: number; size: number }>()

const tag = computed(() => {
  if (isHeart(props.x, props.y, props.size)) {
    return { label: '♥ Heart', color: 'var(--heart)', title: 'The heart of the wall · one of one' }
  }
  const z = zoneOfFrame(props.x, props.y, props.size)
  const t = tierOf(z.id)
  return { label: t.name, color: t.accent, title: `Placed in the ${t.name}` }
})
</script>

<template>
  <span class="zone-tag" :style="{ '--tag': tag.color }" :title="tag.title">
    <i v-if="!isHeart(x, y, size)" aria-hidden="true" />{{ tag.label }}
  </span>
</template>

<style scoped>
.zone-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--tag) 16%, transparent);
  color: var(--tag);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  white-space: nowrap;
}
.zone-tag i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
</style>
