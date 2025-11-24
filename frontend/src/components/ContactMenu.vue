<template>
    <div>
        <v-menu v-model="menuOpen" offset-y :close-on-content-click="false">
            <template #activator="{ props }">
                <v-btn icon v-bind="props" title="Contacts" class="mr-1">
                    <v-badge :content="contactsCount" color="green" overlap>
                        <v-icon>mdi-account-multiple</v-icon>
                    </v-badge>
                </v-btn>
            </template>

            <v-card style="width: 360px; max-width: calc(100vw - 32px)">
                <v-card-title class="d-flex align-center">
                    <v-icon class="mr-2">mdi-account-multiple</v-icon>
                    Contacts
                    <v-spacer></v-spacer>
                    <v-btn icon small @click="refresh">
                        <v-icon>mdi-refresh</v-icon>
                    </v-btn>
                </v-card-title>
                <v-divider></v-divider>
                <v-card-text style="max-height: 60vh; overflow-y: auto; padding: 0">
                    <!-- reuse ContactList but in compact mode -->
                    <ContactList @action-complete="onActionComplete" />
                </v-card-text>
            </v-card>
        </v-menu>
    </div>
</template>

<script setup>
import ContactList from './ContactList.vue';
import {useAuthStore} from '../store/index.js';
import {ref, computed} from 'vue';

const authStore = useAuthStore();
const menuOpen = ref(false);

const refresh = async() => {
    await authStore.loadContacts();
};

const contactsCount = computed(() => (authStore.contacts || []).length);

const onActionComplete = () => {
  // close the menu after actions like add/remove/block
  menuOpen.value = false;
};
</script>

<style scoped>
/* nothing special here, ContactList has its own styles */
</style>
