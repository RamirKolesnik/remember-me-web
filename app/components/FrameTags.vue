<script setup lang="ts">
// The zone of a frame, in the zone's colour, then its tags: Founder, first
// wave, first in zone, last spot, lucky number, heart neighbour.
// clickable: each pill filters the wall to frames like this one.
// compact: tags shrink to their icon (feed and search rows).
import { isHeart, tagsOf, zoneOfFrame } from '~/shared/wall'
import { tierOf } from '~/shared/tiers'
import { TAG_STYLE, type WallFilter } from '~/shared/tags'

const props = withDefaults(defineProps<{
  frame: { number: number | null; x: number; y: number; size: number }
  clickable?: boolean
  compact?: boolean
}>(), { clickable: false, compact: false })
const emit = defineEmits<{ filter: [filter: WallFilter] }>()

const { milestones } = usePricing()

interface Pill { key: string; label: string; icon: string; color: string; title: string; filter: WallFilter | null }

const pills = computed<Pill[]>(() => {
  const f = props.frame
  const list: Pill[] = []
  if (isHeart(f.x, f.y, f.size)) {
    list.push({ key: 'heart', label: 'Heart', icon: '♥', color: 'var(--heart)', title: 'The heart of the wall · one of one', filter: null })
  } else {
    const z = zoneOfFrame(f.x, f.y, f.size)
    const t = tierOf(z.id)
    list.push({ key: 'zone', label: t.name, icon: '●', color: t.accent, title: `In the ${t.name}`, filter: { kind: 'zone', id: z.id } })
  }
  for (const tag of tagsOf(f, milestones.value)) {
    const st = TAG_STYLE[tag.id]
    list.push({ key: tag.id, label: tag.label, icon: st.icon, color: st.color, title: tag.title, filter: { kind: 'tag', id: tag.id } })
  }
  return list
})

function onClick(e: MouseEvent, p: Pill) {
  if (!props.clickable || !p.filter) return
  e.stopPropagation()
  emit('filter', p.filter)
}

const hint = (p: Pill) => props.clickable && p.filter ? `${p.title} · show all on the wall` : p.title
</script>

<template>
  <span class="tags" :class="{ 'tags--compact': compact }">
    <component
      :is="clickable && p.filter ? 'button' : 'span'"
      v-for="(p, i) in pills"
      :key="p.key"
      :type="clickable && p.filter ? 'button' : undefined"
      class="tag"
      :class="{ 'tag--icon': compact && i > 0 }"
      :style="{ '--tag': p.color }"
      :title="hint(p)"
      :aria-label="compact && i > 0 ? p.label : undefined"
      @click="onClick($event, p)"
    >
      <span class="tag__icon" aria-hidden="true">{{ p.icon }}</span>
      <span v-if="!(compact && i > 0)">{{ p.label }}</span>
    </component>
  </span>
</template>

<style scoped>
.tags { display: flex; flex-wrap: wrap; gap: 6px; }
.tags--compact { gap: 4px; flex-wrap: nowrap; }
.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border: 1px solid color-mix(in srgb, var(--tag) 35%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--tag) 14%, transparent);
  color: var(--tag);
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  line-height: 16px;
  letter-spacing: 0.02em;
  white-space: nowrap;
}
.tag__icon { font-size: 10px; }
.tag--icon { padding: 2px 5px; }
.tags--compact .tag { font-size: 10px; padding-top: 0; padding-bottom: 0; }
button.tag { cursor: pointer; transition: background 0.15s; }
button.tag:hover { background: color-mix(in srgb, var(--tag) 26%, transparent); }
button.tag:focus-visible { outline: 2px solid var(--tag); outline-offset: 1px; }
</style>
