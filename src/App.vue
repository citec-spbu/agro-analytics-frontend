<template>
  <AnalyticsPage :api-base="apiBase" :authorization="authorization" />
</template>

<script setup>
import { onMounted, ref } from 'vue';
import AnalyticsPage from './AnalyticsPage.vue';

const MSG_TYPE = 'AGRO_ANALYTICS_AUTH';

const apiBase = ref('');
const authorization = ref('');

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
  window.addEventListener('message', (event) => {
    if (!isAllowedOrigin(event.origin)) {
      return;
    }
    const data = event.data;
    if (!data || data.type !== MSG_TYPE || !data.payload) {
      return;
    }
    apiBase.value = data.payload.apiBase || '';
    authorization.value = data.payload.authorization || '';
  });

  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'AGRO_ANALYTICS_READY' }, '*');
  }
});
</script>
