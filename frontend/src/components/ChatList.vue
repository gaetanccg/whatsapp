<template>
    <v-card class="chat-list" flat>
        <div class="chat-list-header d-flex align-center">
            <div class="header-title d-flex align-center">
                <v-icon class="mr-2" color="green-darken-1">mdi-forum-outline</v-icon>
                <span class="title-text">Conversations</span>
            </div>
            <v-spacer></v-spacer>
            <v-btn icon @click="showNewChatDialog = true" size="small" class="new-chat-btn">
                <v-icon>mdi-message-plus</v-icon>
            </v-btn>
        </div>

        <v-card-text class="py-2">
            <v-text-field
                v-model="chatStore.searchTerm"
                @update:model-value="onSearch"
                label="Rechercher"
                density="compact"
                variant="outlined"
                hide-details="auto"
                prepend-inner-icon="mdi-magnify"
            />
            <div class="d-flex flex-wrap gap-2 mt-2">
                <v-select
                    :items="sortOptions"
                    v-model="localSort"
                    label="Tri"
                    density="compact"
                    hide-details="auto"
                    style="max-width:160px"
                    @update:model-value="applySort"
                />
                <v-select
                    :items="filterOptions"
                    v-model="chatStore.filter"
                    label="Filtre"
                    density="compact"
                    hide-details="auto"
                    style="max-width:160px"
                    @update:model-value="applyFilter"
                />
            </div>
        </v-card-text>

        <v-list lines="two">
            <v-list-item
                v-for="conversation in chatStore.sortedConversations"
                :key="conversation._id"
                @click="selectConversation(conversation)"
                :active="chatStore.currentConversation?._id === conversation._id"
                class="conversation-item"
            >
                <template v-slot:prepend>
                    <div @click.stop="openProfile(getOtherUser(conversation))" style="cursor:pointer">
                        <v-avatar :color="isUserOnline(conversation) ? 'green-lighten-1' : 'grey'" size="36">
                            <span class="text-white">{{ getConversationInitial(conversation) }}</span>
                        </v-avatar>
                    </div>
                </template>

                <v-list-item-content>
                    <div class="conversation-row">
                        <div class="conversation-main">
                            <div class="conversation-name d-flex align-center">
                                <span>{{ getConversationName(conversation) }}</span>
                                <v-icon
                                  v-if="chatStore.currentConversation?._id === conversation._id"
                                  size="16"
                                  color="green-darken-2"
                                  class="ml-1 current-indicator"
                                  title="Conversation ouverte"
                                >mdi-eye</v-icon>
                                <v-icon
                                  v-else-if="conversation.archived"
                                  size="14"
                                  color="grey"
                                  class="ml-1 archived-indicator"
                                  title="Archivée"
                                >mdi-archive-outline</v-icon>
                            </div>
                            <div class="conversation-snippet">{{ conversation.lastMessage?.content || 'Aucun message' }}</div>
                        </div>

                        <div class="conversation-meta">
                            <div class="time">{{ formatTime(conversation.lastMessage?.createdAt || conversation.createdAt) }}</div>
                            <v-chip v-if="conversation.unreadCount > 0" color="green" size="x-small" class="unread-chip">
                                {{ conversation.unreadCount }}
                            </v-chip>
                        </div>
                    </div>
                    <div class="conversation-subinfo text-caption text-grey" v-if="!conversation.isGroup">
                        <span v-if="isUserOnline(conversation)">En ligne</span>
                        <span v-else>Hors ligne — Dernière vue: {{ formatLastSeen(getLastSeenForConversation(conversation)) }}</span>
                    </div>
                </v-list-item-content>

                <template v-slot:append>
                    <v-menu>
                        <template #activator="{ props }">
                            <v-btn icon v-bind="props" size="small" variant="text">
                                <v-icon>mdi-dots-vertical</v-icon>
                            </v-btn>
                        </template>
                        <v-list density="compact">
                            <v-list-item @click.stop="toggleArchive(conversation)">
                                <v-list-item-title>{{ conversation.archived ? 'Désarchiver' : 'Archiver' }}</v-list-item-title>
                            </v-list-item>
                            <v-list-item @click.stop="deleteConv(conversation)">
                                <v-list-item-title class="text-error">Supprimer</v-list-item-title>
                            </v-list-item>
                        </v-list>
                    </v-menu>
                    <v-list-item-action>
                        <span class="text-caption text-grey">
                          {{ formatTime(conversation.lastMessage?.createdAt || conversation.createdAt) }}
                        </span>
                    </v-list-item-action>
                </template>
            </v-list-item>

            <v-list-item v-if="chatStore.conversations.length === 0">
                <v-list-item-title class="text-center text-grey">
                    Aucune conversation pour le moment
                </v-list-item-title>
            </v-list-item>
        </v-list>

        <v-dialog v-model="showNewChatDialog" max-width="500">
            <v-card>
                <v-card-title class="dialog-title">
                    Nouvelle conversation
                </v-card-title>
                <v-card-text class="pt-4">
                    <v-list>
                        <v-list-item
                            v-for="user in chatStore.users"
                            :key="user._id"
                            @click="startConversation(user._id)"
                        >
                            <template v-slot:prepend>
                                <v-badge
                                    :color="isUserOnlineForUser(user) ? 'success' : 'grey'"
                                    dot
                                    offset-x="10"
                                    offset-y="10"
                                >
                                    <v-avatar :color="isUserOnlineForUser(user) ? 'green-lighten-1' : 'grey'">
                                        <span class="text-white">{{ user.username[0].toUpperCase() }}</span>
                                    </v-avatar>
                                </v-badge>
                            </template>
                            <v-list-item-title>{{ user.username }}</v-list-item-title>
                            <v-list-item-subtitle>{{ user.email }}</v-list-item-subtitle>
                        </v-list-item>
                    </v-list>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn color="grey" variant="text" @click="showNewChatDialog = false">
                        Annuler
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- User profile modal (opened when clicking avatar) -->
        <user-profile-modal v-if="selectedUser" v-model="showProfile" :user="selectedUser" />
    </v-card>
</template>

<script setup>
import {onMounted, ref} from 'vue';
import {useAuthStore, useChatStore} from '../store/index.js';
import {formatDateTimeISO} from '../utils/date.js';
import UserProfileModal from './UserProfileModal.vue';
import socketService from '../services/socket.js';

const chatStore = useChatStore();
const authStore = useAuthStore();
const showNewChatDialog = ref(false);
const showProfile = ref(false);
const selectedUser = ref(null);

const sortOptions = [
  { title: 'Dernière activité', value: 'updatedAt' },
  { title: 'Nom', value: 'groupName' }
];
const filterOptions = [
  { title: 'Tous', value: '' },
  { title: 'Archivées', value: 'archived' },
  { title: 'Non archivées', value: 'unarchived' },
  { title: 'Groupes', value: 'group' },
  { title: 'Direct', value: 'direct' },
  { title: 'Non lues', value: 'unread' }
];

const localSort = ref('updatedAt');

onMounted(async() => {
    await chatStore.fetchConversations();
    await chatStore.fetchUsers();
    socketService.registerConversationEvents(chatStore);
});

const onSearch = () => {
  chatStore.setSearchTerm(chatStore.searchTerm);
};

const applyFilter = () => {
  chatStore.setFilter(chatStore.filter);
};

const applySort = () => {
  chatStore.setSort(localSort.value, 'desc');
};

const selectConversation = (conversation) => {
    chatStore.selectConversation(conversation);
};

const startConversation = async(userId) => {
    await chatStore.createOrGetConversation(userId);
    showNewChatDialog.value = false;
};

const toggleArchive = async(conversation) => {
  if (conversation.archived) {
    await chatStore.unarchiveConversation(conversation._id);
  } else {
    await chatStore.archiveConversation(conversation._id);
  }
};

const deleteConv = async(conversation) => {
  if (confirm('Supprimer la conversation ?')) {
    await chatStore.deleteConversation(conversation._id);
  }
};

const getConversationName = (conversation) => {
    if (conversation.isGroup) {
        return conversation.groupName;
    }

    const otherParticipant = conversation.participants?.find(p => p._id !== authStore.user._id);
    return otherParticipant?.username || 'Inconnu';
};

const getConversationInitial = (conversation) => {
    const name = getConversationName(conversation);
    return name[0].toUpperCase();
};

const formatTime = (timestamp) => {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 86400000) {
        return date.toLocaleTimeString(
            'fr-FR',
            {
                hour: '2-digit',
                minute: '2-digit'
            }
        );
    }

    return date.toLocaleDateString(
        'fr-FR',
        {
            month: 'short',
            day: 'numeric'
        }
    );
};

const getOtherUser = (conversation) => {
    if (!conversation || !conversation.participants) return null;
    // participants could be array of ids or objects
    const other = conversation.participants.find(p => {
        if (!p) return false;
        if (typeof p === 'string') return p !== authStore.user._id;
        if (p._id) return p._id !== authStore.user._id;
        return false;
    });

    if (!other) return null;

    const otherId = typeof other === 'string' ? other : (other._id || null);
    if (!otherId) return typeof other === 'object' ? other : null;

    // find full user info
    return chatStore.users.find(u => u._id === otherId) || { _id: otherId, username: otherId };
};

// Return the other participant id (string) or null
const getOtherId = (conversation) => {
  if (!conversation || !conversation.participants) return null;
  const other = conversation.participants.find(p => {
    if (!p) return false;
    if (typeof p === 'string') return p !== authStore.user._id;
    if (p._id) return p._id !== authStore.user._id;
    return false;
  });
  if (!other) return null;
  return typeof other === 'string' ? other : (other._id || null);
};

// Normalize id to string
const normalizeId = (id) => (id == null ? null : String(id));

// Whether the other participant is online based on the centralized onlineUsers list
const isUserOnline = (conversation) => {
  const id = getOtherId(conversation);
  if (!id) return false;
  const sId = normalizeId(id);
  return (chatStore.onlineUsers || []).some(o => normalizeId(o) === sId);
};

// Get lastSeen for the other participant: check chatStore.users first, then participant object
const getLastSeenForConversation = (conversation) => {
  const id = getOtherId(conversation);
  if (!id) return null;
  const fromStore = chatStore.users.find(u => u._id === id);
  if (fromStore && fromStore.lastSeen) return fromStore.lastSeen;
  // fallback to participant object if it contains lastSeen
  const part = conversation.participants.find(p => {
    if (!p) return false;
    if (typeof p === 'string') return p === id;
    return p._id === id;
  });
  return part?.lastSeen || null;
};

const formatLastSeen = (iso) => formatDateTimeISO(iso);

const openProfile = (user) => {
    if (!user) return;
    // find full user info from chatStore.users if possible
    selectedUser.value = chatStore.users.find(u => u._id === user._id) || user;
    showProfile.value = true;
};

// helper for new-conversation dialog to determine if a user is online
const isUserOnlineForUser = (user) => {
    if (!user) return false;
    const sId = normalizeId(user._id || user);
    return (chatStore.onlineUsers || []).some(o => normalizeId(o) === sId);
};
</script>

<style scoped>
.chat-list{
    height: 100%;
    overflow-y: auto;
}

.chat-list-header{
    padding: 10px 12px;
    border-bottom: 1px solid #eee;
    align-items: center;
}

.header-title .title-text{
    font-weight: 700;
    font-size: 0.95rem;
}

.new-chat-btn{
    background: transparent;
}

.conversation-item{
    cursor: pointer;
    transition: background-color 0.15s;
    padding: 8px 12px;
}

.conversation-item:hover{
    background-color: rgba(0, 0, 0, 0.03);
}

.conversation-row{
    display:flex;
    justify-content:space-between;
    align-items:flex-start;
}

.conversation-main{
    max-width: 70%;
}

.conversation-name{
    font-weight: 600;
    font-size: 0.95rem;
}

.conversation-snippet{
    color: #757575;
    font-size: 0.8rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.conversation-meta{
    text-align: right;
    display:flex;
    flex-direction:column;
    align-items:flex-end;
    gap:4px;
}

.time{
    font-size: 0.75rem;
    color: #9e9e9e;
}

.unread-chip{
    font-weight:700;
}

.conversation-subinfo{
    margin-top:4px;
}

.dialog-title{
    background: #f5f5f5;
    font-weight:700;
}

.current-indicator{opacity:0.85}
.archived-indicator{opacity:0.6}
</style>
