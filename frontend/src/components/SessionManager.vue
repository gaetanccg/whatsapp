<template>
  <div>
    <v-card class="mb-4" variant="outlined">
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-desktop-classic</v-icon> Sessions actives
        <v-spacer></v-spacer>
        <v-btn size="small" variant="text" @click="refreshSessions" :loading="loadingSessions">
          <v-icon>mdi-refresh</v-icon>
        </v-btn>
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text>
        <v-alert v-if="sessions.length === 0" type="info" variant="tonal">Aucune session active</v-alert>
        <v-list v-else density="compact">
          <v-list-item v-for="s in sessions" :key="s._id">
            <template #prepend>
              <v-icon color="green">mdi-lan</v-icon>
            </template>
            <v-list-item-title>
              {{ s.ip || 'IP inconnue' }} – {{ truncateAgent(s.userAgent) }}
            </v-list-item-title>
            <v-list-item-subtitle>
              Créée: {{ formatDate(s.createdAt) }} · Dernière activité: {{ formatDate(s.lastActivity) }}
            </v-list-item-subtitle>
            <template #append>
              <v-btn size="x-small" color="red" variant="text" @click="revoke(s._id)">
                <v-icon size="18">mdi-close</v-icon>
              </v-btn>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>

    <v-card variant="outlined">
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-history</v-icon> Historique des connexions
        <v-spacer></v-spacer>
        <v-btn size="small" variant="text" @click="refreshHistory" :loading="loadingHistory">
          <v-icon>mdi-refresh</v-icon>
        </v-btn>
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text>
        <v-data-table :items="history.items" :headers="headers" :items-per-page="history.limit" class="text-body-2" hide-default-footer>
          <template #item.eventType="{ item }">
            <v-chip :color="item.eventType === 'login' ? 'green' : 'orange'" size="small" variant="flat">{{ item.eventType }}</v-chip>
          </template>
          <template #item.timestamp="{ item }">{{ formatDate(item.timestamp) }}</template>
          <template #item.ip="{ item }">{{ item.ip || 'N/A' }}</template>
          <template #item.userAgent="{ item }">{{ truncateAgent(item.userAgent) }}</template>
        </v-data-table>
        <div class="d-flex justify-end mt-2" v-if="history.total > history.limit">
          <v-pagination v-model="page" :length="pages" @update:modelValue="pageChange" size="small"></v-pagination>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../store/index.js';

const authStore = useAuthStore();
const loadingSessions = ref(false);
const loadingHistory = ref(false);
const page = ref(1);

const sessions = computed(() => authStore.sessions);
const history = computed(() => authStore.history);
const pages = computed(() => Math.ceil(history.value.total / history.value.limit));

const headers = [
  { title: 'Type', value: 'eventType', sortable: false },
  { title: 'Date', value: 'timestamp', sortable: false },
  { title: 'IP', value: 'ip', sortable: false },
  { title: 'Agent', value: 'userAgent', sortable: false }
];

function formatDate(d) {
  try { return new Date(d).toLocaleString(); } catch { return d; }
}
function truncateAgent(ua) {
  if (!ua) return 'N/A';
  return ua.length > 40 ? ua.slice(0, 40) + '…' : ua;
}

async function refreshSessions() {
  loadingSessions.value = true;
  await authStore.fetchSessions();
  loadingSessions.value = false;
}
async function refreshHistory() {
  loadingHistory.value = true;
  await authStore.fetchHistory(page.value, history.value.limit);
  loadingHistory.value = false;
}
async function revoke(id) {
  await authStore.revokeSession(id);
}
function pageChange() {
  refreshHistory();
}

onMounted(async () => {
  await refreshSessions();
  await refreshHistory();
});
</script>
