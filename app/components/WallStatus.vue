<script setup lang="ts">
const { status, load, isDemo } = useWall()
</script>

<template>
  <div class="status">
    <p v-if="isDemo" class="status__pill status__pill--demo">Preview with demo frames — purchases aren't live yet.</p>
    <p v-else class="status__pill status__pill--dev">Test environment — payments are fake, no money moves.</p>
    <p v-if="status === 'loading'" class="status__pill status__pill--wait" role="status">
      Loading the wall… the test server may take up to a minute to wake up.
    </p>
    <p v-else-if="status === 'error'" class="status__pill status__pill--error" role="alert">
      Couldn't load the wall.
      <button type="button" @click="load(true)">Try again</button>
    </p>
  </div>
</template>

<style scoped>
.status {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  max-width: calc(100% - 24px);
  pointer-events: none;
  z-index: 1;
}
.status__pill {
  margin: 0;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  text-align: center;
}
.status__pill--demo, .status__pill--dev { background: var(--amber-soft); color: #633806; }
.status__pill--wait { background: var(--paper); color: var(--ink-2); border: 1px solid var(--line); }
.status__pill--error { background: var(--danger-soft); color: var(--danger); pointer-events: auto; }
.status__pill--error button {
  margin-left: 6px;
  border: 0;
  background: transparent;
  color: inherit;
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
}
</style>
