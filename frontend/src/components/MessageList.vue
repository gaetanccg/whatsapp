<template>
    <v-card flat class="message-list d-flex flex-column" height="100%">
        <v-card-title v-if="chatStore.currentConversation" class="header-compact d-flex align-center">
            <v-avatar
                :color="otherParticipant?.isOnline ? 'green-lighten-1' : 'grey'"
                size="40"
                class="mr-3"
                style="cursor:pointer"
                @click.stop="openProfile(otherParticipant)"
            >
                <span class="text-white">{{ conversationInitial }}</span>
            </v-avatar>
            <div class="header-info">
                <div class="conversation-title">{{ conversationName }}</div>
                <div class="text-caption text-grey" v-if="otherParticipant">
                    <span v-if="isUserOnline(null)">En ligne</span>
                    <span v-else>Dernière vue: {{ formatLastSeen(getLastSeenForConversation(null)) }}</span>
                </div>
            </div>
            <v-spacer></v-spacer>
            <div class="header-actions">
                <v-btn icon small title="Profile" @click.stop="openProfile(otherParticipant)">
                    <v-icon>mdi-account-circle</v-icon>
                </v-btn>
            </div>
        </v-card-title>

        <v-card-text
            v-if="!chatStore.currentConversation"
            class="d-flex align-center justify-center flex-grow-1"
        >
            <div class="text-center text-grey">
                <v-icon size="64" color="grey-lighten-1">mdi-message-text-outline</v-icon>
                <p class="text-h6 mt-4">Sélectionnez une conversation pour commencer</p>
            </div>
        </v-card-text>

        <v-card-text
            v-else
            ref="messageContainer"
            class="messages-container flex-grow-1"
        >
            <div v-if="chatStore.loading" class="text-center py-4">
                <v-progress-circular indeterminate color="green"></v-progress-circular>
            </div>

            <div v-else>
                <div
                    v-for="message in chatStore.messages"
                    :key="message._id"
                    :class="['message-bubble', isOwnMessage(message) ? 'own-message' : 'other-message']"
                >
                    <div class="message-header" v-if="!isOwnMessage(message)">
                        <span class="message-sender">{{ message.sender?.username }}</span>
                    </div>
                    <div class="message-content">
                        {{ message.content }}
                    </div>
                    <div class="message-time">
                        {{ formatTime(message.createdAt) }}
                    </div>
                </div>
            </div>
        </v-card-text>

        <!-- user profile modal for header avatar -->
        <user-profile-modal v-if="selectedUser" v-model="showProfile" :user="selectedUser" />
    </v-card>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue';
import { useChatStore } from '../store/index.js';
import { useAuthStore } from '../store/index.js';
import { formatDateTimeISO } from '../utils/date.js';
import UserProfileModal from './UserProfileModal.vue';

const chatStore = useChatStore();
const authStore = useAuthStore();
const messageContainer = ref(null);
const showProfile = ref(false);
const selectedUser = ref(null);

const conversationName = computed(() => {
    if (!chatStore.currentConversation) return '';

    if (chatStore.currentConversation.isGroup) {
        return chatStore.currentConversation.groupName;
    }

    const otherParticipant = chatStore.currentConversation.participants?.find(p => p._id !== authStore.user._id);
    return otherParticipant?.username || 'Unknown';
});

const conversationInitial = computed(() => {
    return conversationName.value[0]?.toUpperCase() || '?';
});

const otherParticipant = computed(() => {
    if (!chatStore.currentConversation || chatStore.currentConversation.isGroup) return null;
    return chatStore.currentConversation.participants?.find(p => p._id !== authStore.user._id) || null;
});

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

const isUserOnline = (conversation) => {
  const id = getOtherId(conversation || chatStore.currentConversation);
  if (!id) return false;
  return chatStore.onlineUsers.includes(id);
};

const getLastSeenForConversation = (conversation) => {
  const id = getOtherId(conversation || chatStore.currentConversation);
  if (!id) return null;
  const fromStore = chatStore.users.find(u => u._id === id);
  if (fromStore && fromStore.lastSeen) return fromStore.lastSeen;
  const part = (conversation || chatStore.currentConversation).participants.find(p => {
    if (!p) return false;
    if (typeof p === 'string') return p === id;
    return p._id === id;
  });
  return part?.lastSeen || null;
};

const typingText = computed(() => {
    const typingUsernames = Object.values(chatStore.typingUsers);
    if (typingUsernames.length === 0) return '';

    if (typingUsernames.length === 1) {
        return `${typingUsernames[0]} is typing...`;
    }

    return `${typingUsernames.length} people are typing...`;
});

const isOwnMessage = (message) => {
    return message.sender?._id === authStore.user._id;
};

const formatTime = (timestamp) => {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
};

const formatLastSeen = (iso) => formatDateTimeISO(iso);

const scrollToBottom = async () => {
    await nextTick();
    if (messageContainer.value) {
        messageContainer.value.scrollTop = messageContainer.value.scrollHeight;
    }
};

const openProfile = (user) => {
  if (!user) return;
  const full = chatStore.users.find(u => u._id === user._id) || user;
  selectedUser.value = full;
  showProfile.value = true;
};

watch(() => chatStore.messages.length, () => {
    scrollToBottom();
});

watch(() => chatStore.currentConversation, () => {
    scrollToBottom();
});

// end of script setup
</script>

<style scoped>
.message-list{
    position: relative;
}

.messages-container{
    overflow-y: auto;
    padding: 12px;
    background-color: #fafafa;
}

.message-bubble{
    margin-bottom: 10px;
    padding: 10px 14px;
    border-radius: 10px;
    max-width: 70%;
    word-wrap: break-word;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
}

.own-message{
    margin-left: auto;
    background-color: #e6f7ea;
    align-self: flex-end;
}

.other-message{
    margin-right: auto;
    background-color: #ffffff;
    align-self: flex-start;
}

.message-header{
    font-size: 12px;
    color: #075e54;
    font-weight: 600;
    margin-bottom: 6px;
}

.message-content{
    font-size: 14px;
    line-height: 1.4;
    margin-bottom: 6px;
}

.message-time{
    font-size: 11px;
    color: #9e9e9e;
    text-align: right;
}

.header-compact{
    padding: 8px 12px;
    border-bottom: 1px solid #eee;
}

.header-info .conversation-title{
    font-weight: 700;
}

.header-actions v-btn{
    margin-left: 6px;
}
</style>
