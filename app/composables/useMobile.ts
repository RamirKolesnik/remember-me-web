// True on phone-sized screens (the same breakpoint as the CSS: 720px).
// False during prerendering; it updates right after the page mounts.
export function useMobile() {
  const mobile = ref(false)
  let mq: MediaQueryList | null = null
  const update = () => { mobile.value = !!mq?.matches }
  onMounted(() => {
    mq = window.matchMedia('(max-width: 720px)')
    update()
    mq.addEventListener('change', update)
  })
  onBeforeUnmount(() => mq?.removeEventListener('change', update))
  return mobile
}
