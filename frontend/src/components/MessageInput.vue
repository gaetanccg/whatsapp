<template>
    <v-card flat class="message-input-container">
        <v-card-text class="pa-2">
            <div v-if="replyingTo" class="reply-preview mb-2 pa-2">
                <div class="d-flex align-center">
                    <div class="flex-grow-1">
                        <div class="text-caption text-grey">Replying to {{ replyingTo.sender?.username }}</div>
                        <div class="text-body-2">{{ truncateText(replyingTo.content, 50) }}</div>
                    </div>
                    <v-btn icon size="x-small" @click="cancelReply">
                        <v-icon>mdi-close</v-icon>
                    </v-btn>
                </div>
            </div>

            <v-form @submit.prevent="handleSendMessage">
                <div class="d-flex align-center gap-2">
                    <v-text-field
                        v-model="messageText"
                        placeholder="Écrire un message..."
                        variant="outlined"
                        density="compact"
                        hide-details
                        @input="handleTyping"
                        :disabled="!chatStore.currentConversation || uploading"
                        class="flex-grow-1"
                        ref="inputRef"
                    >
                        <template #prepend-inner>
                            <v-btn
                                icon
                                size="small"
                                variant="text"
                                tabindex="-1"
                                :disabled="uploading"
                                @click.stop="triggerFileSelect"
                                title="Joindre un média"
                            >
                                <v-icon color="grey">mdi-paperclip</v-icon>
                            </v-btn>
                            <v-btn
                                icon
                                size="small"
                                variant="text"
                                tabindex="-1"
                                :disabled="uploading"
                            >
                                <v-icon color="grey">mdi-emoticon-happy-outline</v-icon>
                            </v-btn>
                        </template>
                    </v-text-field>

                    <input ref="fileInput" type="file" multiple class="d-none" :accept="accept" @change="handleSelect" />

                    <v-btn
                        icon
                        color="green-darken-1"
                        @click="handleSendMessage"
                        :disabled="!canSendMessage || uploading"
                        :title="isEditing ? 'Modifier' : (uploading ? 'Envoi...' : 'Envoyer')"
                    >
                        <v-icon>{{ isEditing ? 'mdi-check' : 'mdi-send' }}</v-icon>
                    </v-btn>
                </div>
            </v-form>

            <!-- Previews compacts des fichiers sélectionnés -->
            <div v-if="pendingFiles.length" class="selected-files mt-2 d-flex flex-wrap">
                <div
                    v-for="f in pendingFiles"
                    :key="f.__id"
                    class="file-chip d-flex align-center"
                >
                    <div class="thumb" v-if="f.__type==='image' && f.__preview">
                        <img :src="f.__preview" alt="preview" />
                    </div>
                    <v-icon v-else class="mr-1" size="20">{{ iconFor(f) }}</v-icon>
                    <span class="name" :title="f.name">{{ truncate(f.name) }}</span>
                    <v-progress-circular
                        v-if="uploading"
                        indeterminate
                        size="16"
                        width="2"
                        color="green"
                        class="ml-1"
                    />
                    <v-btn
                        v-if="!uploading"
                        icon
                        size="x-small"
                        variant="text"
                        color="red"
                        @click="removeFile(f.__id)"
                    >
                        <v-icon size="16">mdi-close</v-icon>
                    </v-btn>
                </div>
            </div>
        </v-card-text>
    </v-card>
</template>

<script setup>
import {ref, watch, computed, nextTick, onMounted, onUnmounted} from 'vue';
import {useChatStore} from '../store/index.js';
import socketService from '../services/socket.js';
import {messageAPI} from '../services/api.js';
import mediaAPI from '../services/mediaApi.js';
import { usePendingMedia } from '../composables/usePendingMedia.js';

const chatStore = useChatStore();
const messageText = ref('');
const inputRef = ref(null);
const fileInput = ref(null);
const uploading = ref(false);
const replyingTo = ref(null);
const replyEventHandler = ref(null);

const { files: pendingFiles, addFiles, removeFile, clearFiles } = usePendingMedia();

const accept = 'image/*,video/mp4,video/webm,application/pdf';

let typingTimeout = null;
const TYPING_INDICATOR_DELAY = 2000;

const isEditing = computed(() => !!chatStore.editingMessage);

const canSendMessage = computed(() => {
    return !!chatStore.currentConversation && (messageText.value.trim().length > 0 || pendingFiles.value.length > 0);
});

const truncateText = (text, maxLength) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
};

const cancelReply = () => {
    replyingTo.value = null;
};

const setReplyTo = (message) => {
    replyingTo.value = message;
    nextTick(() => {
        inputRef.value?.focus();
    });
};

defineExpose({ setReplyTo });

// Synchroniser le texte avec le message en cours d'édition
watch(() => chatStore.editingMessage, (newValue) => {
    messageText.value = newValue?.content ?? '';

    // Focus sur l'input après mise à jour du texte
    nextTick(() => {
        inputRef.value?.focus();
    });
}, {immediate: true});

onMounted(() => {
    const handler = (e) => {
        if (e.detail) {
            setReplyTo(e.detail);
        }
    };
    window.addEventListener('startReply', handler);
    // sauvegarde pour suppression
    replyEventHandler.value = handler;
});

onUnmounted(() => {
    if (replyEventHandler.value) {
        window.removeEventListener('startReply', replyEventHandler.value);
    }
});

function triggerFileSelect(){
    fileInput.value && fileInput.value.click();
}

function handleSelect(e){
    const list = e.target.files;
    if (!list || !list.length) return;
    addFiles(list);
    e.target.value = '';
}

const handleSendMessage = async() => {
    if (!canSendMessage.value || uploading.value) return;
    const content = messageText.value.trim();
    if (isEditing.value) {
        await editMessage(content);
        messageText.value = '';
        stopTypingIndicator();
        return;
    }
    if (replyingTo.value) {
        await sendReplyMessage(content);
    } else if (pendingFiles.value.length) {
        await sendWithMedia(content);
    } else {
        await sendNewMessage(content);
    }
    messageText.value = '';
    clearFiles();
    replyingTo.value = null;
    stopTypingIndicator();
};

async function sendWithMedia(content){
    if (!chatStore.currentConversation) return;
    uploading.value = true;
    try {
        const controller = new AbortController();
        const res = await mediaAPI.upload(
            chatStore.currentConversation._id,
            pendingFiles.value,
            content,
            {
                signal: controller.signal,
                onUploadProgress: () => {}
            }
        );
        // Ne pas ajouter ici pour éviter doublon si socket reçoit l'événement.
        // Optionnel: fallback si socket rate -> addMessage après timeout.
        setTimeout(() => {
            const exists = chatStore.messages.some(m => m._id === res.data._id);
            if (!exists) chatStore.addMessage(res.data);
        }, 1500);
    } catch (err) {
        console.error('Erreur upload médias:', err.response?.data || err.message);
    } finally {
        uploading.value = false;
    }
}

const editMessage = async(content) => {
    if (!chatStore.editingMessage) return;
    try {
        const res = await messageAPI.editMessage(chatStore.editingMessage._id, content);
        chatStore.updateMessageInStore(res.data);
    } catch (e) {
        console.error('Erreur édition message:', e);
    } finally {
        chatStore.clearEditingMessage();
    }
};

const sendNewMessage = async(content) => {
    socketService.sendMessage(chatStore.currentConversation._id, content);
};

const sendReplyMessage = async(content) => {
    if (!chatStore.currentConversation || !replyingTo.value) return;
    uploading.value = true;
    try {
        const mediaIds = pendingFiles.value.length > 0 ? await uploadMediaFiles() : [];
        const res = await messageAPI.replyToMessage(
            chatStore.currentConversation._id,
            content,
            replyingTo.value._id,
            mediaIds
        );
        setTimeout(() => {
            const exists = chatStore.messages.some(m => m._id === res.data._id);
            if (!exists) chatStore.addMessage(res.data);
        }, 1500);
    } catch (err) {
        console.error('Erreur envoi réponse:', err);
    } finally {
        uploading.value = false;
    }
};

const uploadMediaFiles = async() => {
    const formData = new FormData();
    pendingFiles.value.forEach(f => formData.append('media', f));
    const res = await mediaAPI.upload(chatStore.currentConversation._id, pendingFiles.value, '', {});
    return res.data.media?.map(m => m._id) || [];
};

const handleTyping = () => {
    if (!chatStore.currentConversation) return;
    socketService.sendTyping(chatStore.currentConversation._id, true);
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => { stopTypingIndicator(); }, TYPING_INDICATOR_DELAY);
};

const stopTypingIndicator = () => {
    if (chatStore.currentConversation) {
        socketService.sendTyping(chatStore.currentConversation._id, false);
    }
};

function truncate(name){
    if (name.length <= 18) return name;
    return name.slice(0,15) + '…';
}

function iconFor(f){
    if (f.__type==='video') return 'mdi-video';
    if (f.__type==='doc') return 'mdi-file-document';
    if (f.__type==='image') return 'mdi-image';
    return 'mdi-file';
}
</script>

<style scoped>
.message-input-container{ border-top: 1px solid #e8e8e8; background-color: #ffffff; }
.gap-2{ gap: 8px; }
.selected-files{ gap: 6px; }
.file-chip{ background:#f1f1f1; border-radius:16px; padding:4px 8px; margin:2px; font-size:12px; position:relative; }
.file-chip .thumb{ width:28px; height:28px; border-radius:6px; overflow:hidden; margin-right:6px; }
.file-chip .thumb img{ width:100%; height:100%; object-fit:cover; }
.file-chip .name{ max-width:100px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.reply-preview{ background: #f5f5f5; border-left: 3px solid #25D366; border-radius: 4px; }
</style>
