<template>
    <v-card class="user-status-list" flat>
        <div class="user-list-header d-flex align-center">
            <div class="title">Utilisateurs</div>
            <v-spacer></v-spacer>
            <v-chip small color="green-lighten-1">{{ chatStore.users.length }}</v-chip>
        </div>

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
                        offset-x="16"
                        offset-y="16"
                    >
                        <v-avatar size="34" :color="isUserOnline(user) ? 'green-lighten-1' : 'grey'">
                            <span class="text-white text-caption">{{ user.username[0].toUpperCase() }}</span>
                        </v-avatar>
                    </v-badge>
                </template>

                <v-list-item-content>
                    <v-list-item-title class="user-name">{{ user.username }}</v-list-item-title>
                    <v-list-item-subtitle class="user-lastseen text-caption text-grey">{{ isUserOnline(user) ? 'En ligne' : ('Dernière vue: ' + formatLastSeen(getLastSeen(user))) }}</v-list-item-subtitle>
                </v-list-item-content>
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

.user-list-header{
    display:flex;
    align-items:center;
    padding: 8px 12px;
    border-bottom: 1px solid #eee;
}

.title{
    font-weight:700;
}

.user-item{
    cursor: pointer;
    transition: background-color 0.12s;
    padding: 6px 12px;
}

.user-item:hover{
    background-color: rgba(0, 0, 0, 0.03);
}

.user-name{
    font-size: 0.95rem;
    font-weight:600;
}

.user-lastseen{
    color: #757575;
}
</style>
