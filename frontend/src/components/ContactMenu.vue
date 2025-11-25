<template>
    <v-menu v-model="menuOpen" offset-y :close-on-content-click="false">
        <template #activator="{ props }">
            <v-btn
                icon
                v-bind="props"
                title="Contacts"
                class="mr-1"
                aria-label="Ouvrir les contacts"
            >
                <v-badge
                    :content="contactsCount"
                    :model-value="contactsCount > 0"
                    color="green"
                    overlap
                >
                    <v-icon>mdi-account-multiple</v-icon>
                </v-badge>
            </v-btn>
        </template>

        <v-card style="width: 360px; max-width: calc(100vw - 32px)">
            <v-card-title class="d-flex align-center">
                <v-icon class="mr-2">mdi-account-multiple</v-icon>
                Contacts
                <v-spacer></v-spacer>
                <v-btn
                    icon
                    size="small"
                    @click="handleRefresh"
                    :loading="isRefreshing"
                    title="Actualiser les contacts"
                >
                    <v-icon>mdi-refresh</v-icon>
                </v-btn>
            </v-card-title>
            <v-divider></v-divider>
            <v-card-text class="contacts-content">
                <ContactList @action-complete="handleActionComplete" />
            </v-card-text>
        </v-card>
    </v-menu>
</template>

<script setup>
import {ref, computed} from 'vue';
import {useAuthStore} from '../store/index.js';
import ContactList from './ContactList.vue';

const authStore = useAuthStore();
const menuOpen = ref(false);
const isRefreshing = ref(false);

const contactsCount = computed(() => authStore.contacts?.length ?? 0);

const handleRefresh = async() => {
    isRefreshing.value = true;
    try {
        await authStore.loadContacts();
    } catch (error) {
        console.error('Erreur lors du rechargement des contacts:', error);
    } finally {
        isRefreshing.value = false;
    }
};

const handleActionComplete = () => {
    menuOpen.value = false;
};
</script>

<style scoped>
.contacts-content{
    max-height: 60vh;
    overflow-y: auto;
    padding: 0;
}
</style>
