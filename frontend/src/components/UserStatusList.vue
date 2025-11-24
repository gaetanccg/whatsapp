<template>
    <v-card class="user-status-list" flat>
        <v-card-title class="bg-grey-lighten-2 text-subtitle-1">
            Utilisateurs ({{ chatStore.users.length }})
        </v-card-title>

        <v-list dense>
            <v-list-item
                v-for="user in allUsersList"
                :key="user._id"
                @click="openProfile(user)"
                class="user-item"
            >
                <template v-slot:prepend>
                    <v-badge
                        :color="isUserOnline(user) ? 'success' : 'grey'"
                        dot
                        offset-x="32"
                        offset-y="28"
                    >
                        <v-avatar size="32" :color="isUserOnline(user) ? 'green-lighten-1' : 'grey'">
                            <span class="text-white text-caption">{{ user.username[0].toUpperCase() }}</span>
                        </v-avatar>
                    </v-badge>
                </template>

                <v-list-item-title class="text-body-2">
                    <div>{{ user.username }}</div>
                    <div class="text-caption text-grey">
                        <span v-if="isUserOnline(user)">En ligne</span>
                        <span v-else>Hors ligne — Dernière vue: {{ formatLastSeen(getLastSeen(user)) }}</span>
                    </div>
                </v-list-item-title>
            </v-list-item>

            <v-list-item v-if="allUsersList.length === 0">
                <v-list-item-title class="text-center text-grey text-caption">
                    Aucun utilisateur
                </v-list-item-title>
            </v-list-item>
        </v-list>
    </v-card>
    <user-profile-modal v-if="selectedUser" v-model="showProfile" :user="selectedUser" />
</template>

<script setup>
import {computed, ref} from 'vue';
import {useChatStore} from '../store/index.js';
import {formatDateTimeISO} from '../utils/date.js';
import UserProfileModal from './UserProfileModal.vue';

const chatStore = useChatStore();

const showProfile = ref(false);
const selectedUser = ref(null);

const allUsersList = computed(() => {
    // return users sorted by username with online first (based on chatStore.onlineUsers)
    const users = [...chatStore.users];
    users.sort((a, b) => {
        const aOnline = chatStore.onlineUsers.includes(a._id);
        const bOnline = chatStore.onlineUsers.includes(b._id);
        if (aOnline === bOnline) {
            return a.username.localeCompare(b.username);
        }
        return aOnline ? -1 : 1;
    });
    return users;
});

const isUserOnline = (user) => {
    if (!user) return false;
    return chatStore.onlineUsers.includes(user._id);
};

const getLastSeen = (user) => {
    if (!user) return null;
    // prefer store entry
    const fromStore = chatStore.users.find(u => u._id === (user._id || user));
    if (fromStore && fromStore.lastSeen) return fromStore.lastSeen;
    // fallback to user.lastSeen
    return user.lastSeen || null;
};

const openProfile = (user) => {
    selectedUser.value = user;
    showProfile.value = true;
};

// conversation creation is handled from the profile modal's Message button
const formatLastSeen = (iso) => formatDateTimeISO(iso);
</script>

<style scoped>
.user-status-list{
    max-height: 300px;
    overflow-y: auto;
}

.user-item{
    cursor: pointer;
    transition: background-color 0.2s;
}

.user-item:hover{
    background-color: rgba(0, 0, 0, 0.04);
}
</style>
