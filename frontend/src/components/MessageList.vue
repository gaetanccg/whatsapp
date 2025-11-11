<template>
  <v-card flat class="message-list d-flex flex-column" height="100%">
    <v-card-title v-if="chatStore.currentConversation" class="bg-grey-lighten-3 d-flex align-center">
      <v-avatar color="green-lighten-1" size="40" class="mr-3">
        <span class="text-white">{{ conversationInitial }}</span>
      </v-avatar>
      <div>
        <div class="text-subtitle-1">{{ conversationName }}</div>
        <div v-if="typingText" class="text-caption text-grey">{{ typingText }}</div>
      </div>
    </v-card-title>

    <v-card-text
      v-if="!chatStore.currentConversation"
      class="d-flex align-center justify-center flex-grow-1"
    >
      <div class="text-center text-grey">
        <v-icon size="64" color="grey-lighten-1">mdi-message-text-outline</v-icon>
        <p class="text-h6 mt-4">Select a conversation to start chatting</p>
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
  </v-card>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue';
import { useChatStore } from '../store/index.js';
import { useAuthStore } from '../store/index.js';

const chatStore = useChatStore();
const authStore = useAuthStore();
const messageContainer = ref(null);

const conversationName = computed(() => {
  if (!chatStore.currentConversation) return '';

  if (chatStore.currentConversation.isGroup) {
    return chatStore.currentConversation.groupName;
  }

  const otherParticipant = chatStore.currentConversation.participants?.find(
    p => p._id !== authStore.user._id
  );
  return otherParticipant?.username || 'Unknown';
});

const conversationInitial = computed(() => {
  return conversationName.value[0]?.toUpperCase() || '?';
});

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
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const scrollToBottom = async () => {
  await nextTick();
  if (messageContainer.value) {
    messageContainer.value.scrollTop = messageContainer.value.scrollHeight;
  }
};

watch(() => chatStore.messages.length, () => {
  scrollToBottom();
});

watch(() => chatStore.currentConversation, () => {
  scrollToBottom();
});
</script>

<style scoped>
.message-list {
  position: relative;
}

.messages-container {
  overflow-y: auto;
  padding: 16px;
  background-color: #f5f5f5;
}

.message-bubble {
  margin-bottom: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  max-width: 70%;
  word-wrap: break-word;
}

.own-message {
  margin-left: auto;
  background-color: #dcf8c6;
  align-self: flex-end;
}

.other-message {
  margin-right: auto;
  background-color: white;
  align-self: flex-start;
}

.message-header {
  font-size: 12px;
  color: #075e54;
  font-weight: 600;
  margin-bottom: 4px;
}

.message-content {
  font-size: 14px;
  line-height: 1.4;
  margin-bottom: 4px;
}

.message-time {
  font-size: 11px;
  color: #999;
  text-align: right;
}
</style>
