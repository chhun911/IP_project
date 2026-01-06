<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  msg: string
}>()

const count = ref(0)
</script>

<template>
  <div class="card">
    <p>{{ msg }}</p>
    <p>
      <button type="button" @click="count++">count is {{ count }}</button>
    </p>
  </div>
</template>

<style scoped>
.card {
  padding: 2em;
  border: 1px solid #eee;
  border-radius: 8px;
}

button {
  padding: 0.6em 1.2em;
  font-size: 1em;
  cursor: pointer;
  border: 1px solid #007bff;
  border-radius: 4px;
  background-color: #007bff;
  color: white;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #0056b3;
}
</style>
