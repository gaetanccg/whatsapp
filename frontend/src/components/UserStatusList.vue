<template>
    <v-card class="user-status-list" flat>
        <div class="user-list-header">
            <span class="title">Utilisateurs</span>
            <v-spacer></v-spacer>
            <v-chip size="small" color="green-lighten-1">
                {{ chatStore.users.length }}
            </v-chip>
        </div>

        <v-list dense>
            <v-list-item
                v-for="user in sortedUsers"
                :key="user._id"
                @click="openProfile(user)"
                class="user-item"
            >
                <template #prepend>
                    <v-badge
                        :color="isUserOnline(user) ? 'success' : 'grey'"
                        dot
                        offset-x="16"
                        offset-y="16"
                    >
                        <v-avatar
                            size="34"
                            :color="isUserOnline(user) ? 'green-lighten-1' : 'grey'"
                        >
                            <span class="text-white text-caption">
                                {{ getUserInitial(user) }}
                            </span>
                        </v-avatar>
                    </v-badge>
                </template>

                <v-list-item-content>
                    <v-list-item-title class="user-name">
                        {{ user.username }}
                    </v-list-item-title>
                    <v-list-item-subtitle class="user-status text-caption text-grey">
                        {{ getUserStatus(user) }}
                    </v-list-item-subtitle>
                </v-list-item-content>
            </v-list-item>

            <v-list-item v-if="sortedUsers.length === 0">
                <v-list-item-title class="text-center text-grey text-caption">
                    Aucun utilisateur
                </v-list-item-title>
            </v-list-item>
        </v-list>

        <UserProfileModal
            v-if="selectedUser"
            v-model="showProfile"
            :user="selectedUser"
        />
    </v-card>
</template>

<script setup>
import {computed, ref} from 'vue';
import {useChatStore} from '../store/index.js';
import {formatDateTimeISO} from '../utils/date.js';
import UserProfileModal from './UserProfileModal.vue';

const chatStore = useChatStore();
const showProfile = ref(false);
const selectedUser = ref(null);

const sortedUsers = computed(() => {
    return [...chatStore.users].sort((a, b) => {
        const aOnline = isUserOnline(a);
        const bOnline = isUserOnline(b);

        if (aOnline !== bOnline) {
            return aOnline ? -1 : 1;
        }

        return a.username.localeCompare(b.username);
    });
});

const isUserOnline = (user) => {
    return user?._id && chatStore.onlineUsers.includes(user._id);
};

const getUserInitial = (user) => {
    return user?.username?.[0]?.toUpperCase() ?? '?';
};

const getLastSeen = (user) => {
    if (!user) return null;

    const fromStore = chatStore.users.find(u => u._id === user._id);
    return fromStore?.lastSeen ?? user.lastSeen ?? null;
};

const getUserStatus = (user) => {
    if (isUserOnline(user)) {
        return 'En ligne';
    }

    const lastSeen = getLastSeen(user);
    return lastSeen ? `Dernière vue: ${formatDateTimeISO(lastSeen)}` : 'Hors ligne';
};

const openProfile = (user) => {
    selectedUser.value = user;
    showProfile.value = true;
};
</script>

<style scoped>
.user-status-list{
    max-height: 300px;
    overflow-y: auto;
}

.user-list-header{
    display: flex;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 1px solid #eee;
}

.title{
    font-weight: 700;
    font-size: 0.95rem;
}

.user-item{
    cursor: pointer;
    transition: background-color 0.12s ease;
    padding: 6px 12px;
}

.user-item:hover{
    background-color: rgba(0, 0, 0, 0.03);
}

.user-name{
    font-size: 0.95rem;
    font-weight: 600;
}

.user-status{
    color: #757575;
}
</style>
