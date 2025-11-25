<template>
    <v-card flat class="message-input-container" ref="containerRef">
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
                <div class="d-flex align-center gap-2 position-relative">
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
                        @keydown.esc="closeEmojiPicker"
                    >
                        <template #prepend-inner>
                            <v-btn
                                icon
                                size="small"
                                variant="text"
                                tabindex="-1"
                                :disabled="uploading"
                                @mousedown.prevent
                                @click.stop="triggerFileSelect"
                                title="Joindre un média"
                                aria-label="Joindre un média"
                            >
                                <v-icon color="grey">mdi-paperclip</v-icon>
                            </v-btn>
                            <v-btn
                                class="emoji-toggle-btn"
                                icon
                                size="small"
                                variant="text"
                                tabindex="-1"
                                :disabled="uploading"
                                @mousedown.prevent
                                @click.stop="toggleEmojiPicker"
                                :title="showEmojiPicker ? 'Fermer les emojis' : 'Emoji'"
                                aria-label="Ouvrir le sélecteur d'emoji"
                                ref="toggleBtnRef"
                            >
                                <v-icon :color="showEmojiPicker ? 'green-darken-2' : 'grey'">mdi-emoticon-happy-outline</v-icon>
                            </v-btn>
                        </template>
                    </v-text-field>

                    <!-- Panneau Emoji (positionné fixed) -->
                    <div
                        v-if="showEmojiPicker"
                        ref="emojiPanelRef"
                        class="emoji-panel"
                        :style="emojiPanelStyle"
                        @keydown.esc.stop.prevent="closeEmojiPicker"
                    >
                        <EmojiPicker
                            @select="onSelectEmoji"
                            :disable-skin-tones="true"
                            :static-texts="{placeholder: 'Rechercher…'}"
                        />
                    </div>

                    <input ref="fileInput" type="file" multiple class="d-none" :accept="accept" @change="handleSelect" />
                    <v-btn
                        icon
                        color="green-darken-1"
                        @click="handleSendMessage"
                        :disabled="!canSendMessage || uploading"
                        :title="isEditing ? 'Modifier' : (uploading ? 'Envoi...' : 'Envoyer')"
                        aria-label="Envoyer le message"
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
import EmojiPicker from 'vue3-emoji-picker';
import 'vue3-emoji-picker/css';

const chatStore = useChatStore();
const messageText = ref('');
const inputRef = ref(null);
const fileInput = ref(null);
const uploading = ref(false);
const replyingTo = ref(null);
const replyEventHandler = ref(null);
const showEmojiPicker = ref(false);
const emojiPanelRef = ref(null);
const containerRef = ref(null);
const toggleBtnRef = ref(null);
const emojiPanelStyle = ref({});

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

let lastCaret = { start: null, end: null };

function positionEmojiPanel(){
    const anchor = toggleBtnRef.value?.$el || toggleBtnRef.value; // Vuetify VBtn expose $el, fallback
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const panelW = 280; // largeur définie dans CSS
    const panelH = 340; // hauteur max
    let top = rect.bottom + 4;
    let left = rect.left;
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    // Si dépasse en bas -> afficher au-dessus
    if (top + panelH > vh - 8){
        top = rect.top - panelH - 4;
        if (top < 8) top = 8;
    }
    // Ajuster si dépasse à droite
    if (left + panelW > vw - 8){
        left = vw - panelW - 8;
    }
    emojiPanelStyle.value = {
        position: 'fixed',
        top: top + 'px',
        left: left + 'px',
        zIndex: 2600
    };
}

function toggleEmojiPicker(){
    showEmojiPicker.value = !showEmojiPicker.value;
    if (showEmojiPicker.value){
        captureCaret();
        nextTick(() => { positionEmojiPanel(); bindOutsideClick(); bindResize(); });
    } else {
        unbindOutsideClick();
        unbindResize();
    }
}

function closeEmojiPicker(){
    if (!showEmojiPicker.value) return;
    showEmojiPicker.value = false;
    unbindOutsideClick();
    unbindResize();
}

function bindResize(){
    window.addEventListener('resize', positionEmojiPanel);
}
function unbindResize(){
    window.removeEventListener('resize', positionEmojiPanel);
}

function captureCaret(){
    try {
        const el = inputRef.value?.$el?.querySelector('input, textarea');
        if (el){
            lastCaret.start = el.selectionStart;
            lastCaret.end = el.selectionEnd;
        }
    } catch(e){ /* noop */ }
}

function restoreFocus(){
    const el = inputRef.value?.$el?.querySelector('input, textarea');
    if (el){
        el.focus();
        if (lastCaret.start !== null){
            try { el.setSelectionRange(lastCaret.start, lastCaret.start); } catch(e){/* */}
        }
    }
}

function onSelectEmoji(emoji){
    const symbol = typeof emoji === 'string' ? emoji : (emoji?.i || emoji?.emoji || '');
    if (!symbol) return;
    captureCaret();
    const text = messageText.value;
    if (lastCaret.start !== null && lastCaret.end !== null){
        const before = text.slice(0, lastCaret.start);
        const after = text.slice(lastCaret.end);
        messageText.value = before + symbol + after;
        lastCaret.start = before.length + symbol.length;
        lastCaret.end = lastCaret.start;
    } else {
        messageText.value += symbol;
        lastCaret.start = messageText.value.length;
        lastCaret.end = lastCaret.start;
    }
    nextTick(() => { restoreFocus(); });
    handleTyping();
}

watch(() => messageText.value, (val) => {
    if (!val && showEmojiPicker.value) closeEmojiPicker();
});

let outsideHandler = null;
function bindOutsideClick(){
    outsideHandler = (e) => {
        if (!emojiPanelRef.value) return;
        if (emojiPanelRef.value.contains(e.target)) return;
        if (containerRef.value?.contains(e.target)) {
            // Click à l'intérieur du container (input / boutons) ne ferme pas sauf si hors panel
            const toggleBtn = containerRef.value.querySelector('.emoji-toggle-btn');
            if (toggleBtn && toggleBtn.contains(e.target)) return; // géré par toggle
        }
        closeEmojiPicker();
    };
    document.addEventListener('mousedown', outsideHandler);
}
function unbindOutsideClick(){
    if (outsideHandler){
        document.removeEventListener('mousedown', outsideHandler);
        outsideHandler = null;
    }
}

onUnmounted(() => { unbindOutsideClick(); unbindResize(); });

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
.emoji-panel{ background:#fff; border:1px solid #ddd; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.15); padding:4px; width: 280px; max-height:340px; overflow:hidden; }
/* Retrait dépendances de position absolue (gérée inline en fixed) */
.position-relative{ position: relative; }
</style>
