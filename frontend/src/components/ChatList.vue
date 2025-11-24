<template>
    <v-card class="chat-list" flat>
        <v-card-title class="bg-green-darken-1 text-white d-flex align-center">
            <span>Conversations</span>
            <v-spacer></v-spacer>
            <v-btn icon @click="showNewChatDialog = true" size="small" variant="text">
                <v-icon>mdi-message-plus</v-icon>
            </v-btn>
        </v-card-title>

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
                        <v-avatar :color="isUserOnline(conversation) ? 'green-lighten-1' : 'grey'">
                            <span class="text-white">{{ getConversationInitial(conversation) }}</span>
                        </v-avatar>
                    </div>
                </template>

                <v-list-item-title>
                    {{ getConversationName(conversation) }}
                    <v-chip
                        v-if="conversation.unreadCount > 0"
                        color="green"
                        size="x-small"
                        class="ml-2"
                    >
                        {{ conversation.unreadCount }}
                    </v-chip>
                </v-list-item-title>

                <v-list-item-subtitle>
                    <div>{{ conversation.lastMessage?.content || 'No messages yet' }}</div>
                    <div class="text-caption text-grey" v-if="!conversation.isGroup">
                        <span v-if="isUserOnline(conversation)">En ligne</span>
                        <span v-else>Hors ligne — Dernière vue: {{ formatLastSeen(getLastSeenForConversation(conversation)) }}</span>
                    </div>
                </v-list-item-subtitle>

                <template v-slot:append>
                    <v-list-item-action>
            <span class="text-caption text-grey">
              {{ formatTime(conversation.lastMessage?.createdAt || conversation.createdAt) }}
            </span>
                    </v-list-item-action>
                </template>
            </v-list-item>

            <v-list-item v-if="chatStore.conversations.length === 0">
                <v-list-item-title class="text-center text-grey">
                    No conversations yet. Start a new chat!
                </v-list-item-title>
            </v-list-item>
        </v-list>

        <v-dialog v-model="showNewChatDialog" max-width="500">
            <v-card>
                <v-card-title class="bg-green-darken-1 text-white">
                    New Conversation
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
                                    :color="user.isOnline ? 'success' : 'grey'"
                                    dot
                                    offset-x="10"
                                    offset-y="10"
                                >
                                    <v-avatar color="green-lighten-1">
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
                        Cancel
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- User profile modal (opened when clicking avatar) -->
        <user-profile-modal v-if="selectedUser" v-model="showProfile" :user="selectedUser" />
    </v-card>
</template>

<script setup>
import {ref, onMounted} from 'vue';
import {useChatStore} from '../store/index.js';
import {useAuthStore} from '../store/index.js';
import {formatDateTimeISO} from '../utils/date.js';
import UserProfileModal from './UserProfileModal.vue';

const chatStore = useChatStore();
const authStore = useAuthStore();
const showNewChatDialog = ref(false);
const showProfile = ref(false);
const selectedUser = ref(null);

onMounted(async() => {
    await chatStore.fetchConversations();
    await chatStore.fetchUsers();
});

const selectConversation = (conversation) => {
    chatStore.selectConversation(conversation);
};

const startConversation = async(userId) => {
    await chatStore.createOrGetConversation(userId);
    showNewChatDialog.value = false;
};

const getConversationName = (conversation) => {
    if (conversation.isGroup) {
        return conversation.groupName;
    }

    const otherParticipant = conversation.participants?.find(p => p._id !== authStore.user._id);
    return otherParticipant?.username || 'Unknown';
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
            'en-US',
            {
                hour: '2-digit',
                minute: '2-digit'
            }
        );
    }

    return date.toLocaleDateString(
        'en-US',
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

// Whether the other participant is online based on the centralized onlineUsers list
const isUserOnline = (conversation) => {
  const id = getOtherId(conversation);
  if (!id) return false;
  return chatStore.onlineUsers.includes(id);
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
    const full = chatStore.users.find(u => u._id === user._id) || user;
    selectedUser.value = full;
    showProfile.value = true;
};
</script>

<style scoped>
.chat-list{
    height: 100%;
    overflow-y: auto;
}

.conversation-item{
    cursor: pointer;
    transition: background-color 0.2s;
}

.conversation-item:hover{
    background-color: rgba(0, 0, 0, 0.04);
}
</style>
