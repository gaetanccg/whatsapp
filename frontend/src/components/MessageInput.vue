<template>
    <v-card flat class="message-input-container">
        <v-card-text class="pa-2">
            <v-form @submit.prevent="handleSendMessage">
                <div class="d-flex align-center gap-2">
                    <v-text-field
                        v-model="messageText"
                        placeholder="Écrire un message..."
                        variant="outlined"
                        density="compact"
                        hide-details
                        @input="handleTyping"
                        :disabled="!chatStore.currentConversation"
                        class="flex-grow-1"
                        ref="inputRef"
                    >
                        <template #prepend-inner>
                            <v-btn
                                icon
                                size="small"
                                variant="text"
                                tabindex="-1"
                            >
                                <v-icon color="grey">mdi-emoticon-happy-outline</v-icon>
                            </v-btn>
                        </template>
                    </v-text-field>

                    <v-btn
                        icon
                        color="green-darken-1"
                        @click="handleSendMessage"
                        :disabled="!canSendMessage"
                        :title="isEditing ? 'Modifier' : 'Envoyer'"
                    >
                        <v-icon>{{ isEditing ? 'mdi-check' : 'mdi-send' }}</v-icon>
                    </v-btn>
                </div>
            </v-form>
        </v-card-text>
    </v-card>
</template>

<script setup>
import {ref, watch, computed, nextTick} from 'vue';
import {useChatStore} from '../store/index.js';
import socketService from '../services/socket.js';
import {messageAPI} from '../services/api.js';

const chatStore = useChatStore();
const messageText = ref('');
const inputRef = ref(null);

let typingTimeout = null;
const TYPING_INDICATOR_DELAY = 2000;

const isEditing = computed(() => !!chatStore.editingMessage);

const canSendMessage = computed(() => {
    return messageText.value.trim() && chatStore.currentConversation;
});

// Synchroniser le texte avec le message en cours d'édition
watch(() => chatStore.editingMessage, (newValue) => {
    messageText.value = newValue?.content ?? '';

    // Focus sur l'input après mise à jour du texte
    nextTick(() => {
        inputRef.value?.focus();
    });
}, {immediate: true});

const handleSendMessage = async() => {
    if (!canSendMessage.value) return;

    const content = messageText.value.trim();

    try {
        if (isEditing.value) {
            await editMessage(content);
        } else {
            await sendNewMessage(content);
        }

        messageText.value = '';
        stopTypingIndicator();
    } catch (error) {
        console.error('Erreur lors de l\'envoi du message:', error);
    }
};

const editMessage = async(content) => {
    const res = await messageAPI.editMessage(chatStore.editingMessage._id, content);
    chatStore.updateMessageInStore(res.data);
    chatStore.clearEditingMessage();
};

const sendNewMessage = async(content) => {
    socketService.sendMessage(chatStore.currentConversation._id, content);
};

const handleTyping = () => {
    if (!chatStore.currentConversation) return;

    socketService.sendTyping(chatStore.currentConversation._id, true);

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        stopTypingIndicator();
    }, TYPING_INDICATOR_DELAY);
};

const stopTypingIndicator = () => {
    if (chatStore.currentConversation) {
        socketService.sendTyping(chatStore.currentConversation._id, false);
    }
};
</script>

<style scoped>
.message-input-container{
    border-top: 1px solid #e8e8e8;
    background-color: #ffffff;
}

.gap-2{
    gap: 8px;
}
</style>
