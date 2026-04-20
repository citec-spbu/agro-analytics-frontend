<template>
  <AnalyticsPage :api-base="apiBase" :authorization="authorization" :dark="themeDark" />
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import AnalyticsPage from './AnalyticsPage.vue';

const MSG_TYPE = 'AGRO_ANALYTICS_AUTH';

const apiBase = ref('');
const authorization = ref('');
/** В iframe до postMessage держим палитру по ОС, чтобы не было «слепого» первого кадра */
function initialThemeDark() {
  if (typeof window === 'undefined') return false;
  if (!window.parent || window.parent === window) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

const themeDark = ref(initialThemeDark());

if (typeof document !== 'undefined' && typeof window !== 'undefined' && window.parent !== window) {
  applyRootDarkClass(themeDark.value);
}

function isEmbedded() {
  return typeof window !== 'undefined' && window.parent && window.parent !== window;
}

function applyRootDarkClass(isDark) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('agro-analytics--dark', Boolean(isDark));
}

function readStandaloneDarkPreference() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function syncStandaloneTheme() {
  if (isEmbedded()) return;
  themeDark.value = readStandaloneDarkPreference();
  applyRootDarkClass(themeDark.value);
}

let mediaQueryListener;
function onMessage(event) {
  if (!isAllowedOrigin(event.origin)) {
    return;
  }
  const data = event.data;
  if (!data || data.type !== MSG_TYPE || !data.payload) {
    return;
  }
  apiBase.value = data.payload.apiBase || '';
  authorization.value = data.payload.authorization || '';
  if (Object.prototype.hasOwnProperty.call(data.payload, 'dark')) {
    themeDark.value = Boolean(data.payload.dark);
  } else {
    themeDark.value = readStandaloneDarkPreference();
  }
  applyRootDarkClass(themeDark.value);
}

function isAllowedOrigin(origin) {
  const raw = import.meta.env.VITE_PARENT_ORIGIN_ALLOWLIST;
  if (!raw || String(raw).trim() === '') {
    return true;
  }
  const list = String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list.some((o) => origin === o || origin.startsWith(o));
}

onMounted(() => {
  if (isEmbedded()) {
    applyRootDarkClass(themeDark.value);
  }

  if (!isEmbedded()) {
    syncStandaloneTheme();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQueryListener = () => syncStandaloneTheme();
    mq.addEventListener('change', mediaQueryListener);
  }

  window.addEventListener('message', onMessage);

  if (isEmbedded()) {
    window.parent.postMessage({ type: 'AGRO_ANALYTICS_READY' }, '*');
  }
});

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('message', onMessage);
  }
  if (mediaQueryListener && typeof window !== 'undefined') {
    window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', mediaQueryListener);
  }
});

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    window.location.reload();
  });
}
</script>
