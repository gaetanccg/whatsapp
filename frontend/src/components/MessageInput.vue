<template>
  <v-card flat class="message-input-container">
    <v-card-text class="pa-2">
      <v-form @submit.prevent="sendMessage">
        <div class="d-flex align-center">
          <v-text-field
            v-model="messageText"
            placeholder="Type a message..."
            variant="outlined"
            density="compact"
            hide-details
            @input="handleTyping"
            :disabled="!chatStore.currentConversation"
          >
            <template v-slot:prepend-inner>
              <v-icon color="grey">mdi-emoticon-happy-outline</v-icon>
            </template>
          </v-text-field>

          <v-btn
            icon
            color="green-darken-1"
            class="ml-2"
            @click="sendMessage"
            :disabled="!messageText.trim() || !chatStore.currentConversation"
          >
            <v-icon>mdi-send</v-icon>
          </v-btn>
        </div>
      </v-form>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref } from 'vue';
import { useChatStore } from '../store/index.js';
import socketService from '../services/socket.js';

const chatStore = useChatStore();
const messageText = ref('');
let typingTimeout = null;

const sendMessage = () => {
  if (!messageText.value.trim() || !chatStore.currentConversation) return;

  socketService.sendMessage(chatStore.currentConversation._id, messageText.value.trim());
  messageText.value = '';

  socketService.sendTyping(chatStore.currentConversation._id, false);
};

const handleTyping = () => {
  if (!chatStore.currentConversation) return;

  socketService.sendTyping(chatStore.currentConversation._id, true);

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socketService.sendTyping(chatStore.currentConversation._id, false);
  }, 2000);
};
</script>

<style scoped>
.message-input-container {
  border-top: 1px solid #e0e0e0;
  background-color: #f5f5f5;
}
</style>
