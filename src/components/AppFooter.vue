<template>
  <footer class="app-footer">
    <div class="footer-content">
      <span class="footer-text">智能备考系统 © 2026</span>
      <span class="footer-divider">|</span>
      <span class="footer-version">版本：{{ version }}</span>
      <span class="footer-divider">|</span>
      <span class="footer-links">
        <router-link to="/admin">系统管理</router-link>
      </span>
    </div>
  </footer>
</template>

<script setup>
import { ref } from 'vue';
import { SYSTEM_VERSION } from '../version.js';
const version = ref(SYSTEM_VERSION);
</script>

<style scoped>
.app-footer {
  background: #fff;
  border-top: 1px solid #e5e7eb;
  padding: 16px 24px;
  margin-top: auto;
}

.footer-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 13px;
  color: #6b7280;
}

.footer-divider {
  color: #d1d5db;
}

.footer-version {
  font-weight: 600;
  color: #10b981;
}

.footer-links a {
  color: #10b981;
  text-decoration: none;
  transition: color 0.2s;
}

.footer-links a:hover {
  color: #059669;
  text-decoration: underline;
}
</style>
