<template>
    <div class="session-manager">
        <!-- Sessions actives -->
        <v-card class="mb-4" variant="outlined">
            <v-card-title class="d-flex align-center">
                <v-icon class="mr-2">mdi-desktop-classic</v-icon>
                Sessions actives
                <v-spacer></v-spacer>
                <v-btn
                    size="small"
                    variant="text"
                    @click="refreshSessions"
                    :loading="loadingSessions"
                    title="Actualiser les sessions"
                >
                    <v-icon>mdi-refresh</v-icon>
                </v-btn>
            </v-card-title>
            <v-divider></v-divider>
            <v-card-text>
                <v-alert
                    v-if="sessions.length === 0"
                    type="info"
                    variant="tonal"
                >
                    Aucune session active
                </v-alert>

                <v-list v-else density="compact">
                    <v-list-item
                        v-for="session in sessions"
                        :key="session._id"
                    >
                        <template #prepend>
                            <v-icon color="green">mdi-lan</v-icon>
                        </template>

                        <v-list-item-title>
                            {{ session.ip || 'IP inconnue' }} – {{ truncateAgent(session.userAgent) }}
                        </v-list-item-title>

                        <v-list-item-subtitle>
                            Créée: {{ formatDate(session.createdAt) }} ·
                            Dernière activité: {{ formatDate(session.lastActivity) }}
                        </v-list-item-subtitle>

                        <template #append>
                            <v-btn
                                size="x-small"
                                color="red"
                                variant="text"
                                @click="handleRevoke(session._id)"
                                title="Révoquer cette session"
                            >
                                <v-icon size="18">mdi-close</v-icon>
                            </v-btn>
                        </template>
                    </v-list-item>
                </v-list>
            </v-card-text>
        </v-card>

        <!-- Historique des connexions -->
        <v-card variant="outlined">
            <v-card-title class="d-flex align-center">
                <v-icon class="mr-2">mdi-history</v-icon>
                Historique des connexions
                <v-spacer></v-spacer>
                <v-btn
                    size="small"
                    variant="text"
                    @click="refreshHistory"
                    :loading="loadingHistory"
                    title="Actualiser l'historique"
                >
                    <v-icon>mdi-refresh</v-icon>
                </v-btn>
            </v-card-title>
            <v-divider></v-divider>
            <v-card-text>
                <v-data-table
                    :items="history.items"
                    :headers="headers"
                    :items-per-page="history.limit"
                    class="text-body-2"
                    hide-default-footer
                >
                    <template #item.eventType="{ item }">
                        <v-chip
                            :color="getEventColor(item.eventType)"
                            size="small"
                            variant="flat"
                        >
                            {{ item.eventType }}
                        </v-chip>
                    </template>

                    <template #item.timestamp="{ item }">
                        {{ formatDate(item.timestamp) }}
                    </template>

                    <template #item.ip="{ item }">
                        {{ item.ip || 'N/A' }}
                    </template>

                    <template #item.userAgent="{ item }">
                        {{ truncateAgent(item.userAgent) }}
                    </template>
                </v-data-table>

                <div
                    v-if="totalPages > 1"
                    class="d-flex justify-end mt-2"
                >
                    <v-pagination
                        v-model="currentPage"
                        :length="totalPages"
                        @update:model-value="handlePageChange"
                        size="small"
                    ></v-pagination>
                </div>
            </v-card-text>
        </v-card>
    </div>
</template>

<script setup>
import {ref, computed, onMounted} from 'vue';
import {useAuthStore} from '../store/index.js';

const authStore = useAuthStore();
const loadingSessions = ref(false);
const loadingHistory = ref(false);
const currentPage = ref(1);

const sessions = computed(() => authStore.sessions ?? []);
const history = computed(() => authStore.history ?? {
    items: [],
    total: 0,
    limit: 10
});
const totalPages = computed(() => Math.ceil(history.value.total / history.value.limit));

const headers = [
    {
        title: 'Type',
        value: 'eventType',
        sortable: false
    },
    {
        title: 'Date',
        value: 'timestamp',
        sortable: false
    },
    {
        title: 'IP',
        value: 'ip',
        sortable: false
    },
    {
        title: 'Agent',
        value: 'userAgent',
        sortable: false
    }
];

const MAX_AGENT_LENGTH = 40;

function formatDate(dateString) {
    try {
        return new Date(dateString).toLocaleString('fr-FR');
    } catch (error) {
        console.error('Erreur de formatage de date:', error);
        return dateString;
    }
}

function truncateAgent(userAgent) {
    if (!userAgent) return 'N/A';

    return userAgent.length > MAX_AGENT_LENGTH ? `${userAgent.slice(0, MAX_AGENT_LENGTH)}…` : userAgent;
}

function getEventColor(eventType) {
    return eventType === 'login' ? 'green' : 'orange';
}

async function refreshSessions() {
    loadingSessions.value = true;
    try {
        await authStore.fetchSessions();
    } catch (error) {
        console.error('Erreur lors du rechargement des sessions:', error);
    } finally {
        loadingSessions.value = false;
    }
}

async function refreshHistory() {
    loadingHistory.value = true;
    try {
        await authStore.fetchHistory(currentPage.value, history.value.limit);
    } catch (error) {
        console.error('Erreur lors du rechargement de l\'historique:', error);
    } finally {
        loadingHistory.value = false;
    }
}

async function handleRevoke(sessionId) {
    if (!confirm('Êtes-vous sûr de vouloir révoquer cette session ?')) return;

    try {
        await authStore.revokeSession(sessionId);
        await refreshSessions();
    } catch (error) {
        console.error('Erreur lors de la révocation de la session:', error);
    }
}

function handlePageChange() {
    refreshHistory();
}

onMounted(async() => {
    await Promise.all([
        refreshSessions(),
        refreshHistory()
    ]);
});
</script>

<style scoped>
.session-manager{
    /* Conteneur principal */
}
</style>
