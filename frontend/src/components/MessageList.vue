<template>
    <v-card flat class="message-list">
        <!-- En-tête de conversation -->
        <v-card-title
            v-if="chatStore.currentConversation"
            class="conversation-header"
        >
            <v-avatar
                :color="isParticipantOnline ? 'green-lighten-1' : 'grey'"
                size="40"
                class="mr-3 cursor-pointer"
                @click.stop="handleOpenProfile(otherParticipant)"
            >
                <span class="text-white">{{ conversationInitial }}</span>
            </v-avatar>

            <div class="header-info">
                <div class="conversation-title">{{ conversationName }}</div>
                <div v-if="otherParticipant" class="text-caption text-grey">
                    <span v-if="isParticipantOnline">En ligne</span>
                    <span v-else>Dernière vue: {{ participantLastSeen }}</span>
                </div>
            </div>

            <v-spacer></v-spacer>

            <div class="header-actions">
                <v-btn
                    icon
                    size="small"
                    title="Voir le profil"
                    @click.stop="handleOpenProfile(otherParticipant)"
                >
                    <v-icon>mdi-account-circle</v-icon>
                </v-btn>
            </div>
        </v-card-title>

        <!-- État vide -->
        <v-card-text
            v-if="!chatStore.currentConversation"
            class="empty-state"
        >
            <div class="text-center text-grey">
                <v-icon size="64" color="grey-lighten-1">
                    mdi-message-text-outline
                </v-icon>
                <p class="text-h6 mt-4">
                    Sélectionnez une conversation pour commencer
                </p>
            </div>
        </v-card-text>

        <!-- Liste des messages -->
        <v-card-text
            v-else
            ref="messageContainer"
            class="messages-container"
        >
            <!-- Chargement -->
            <div v-if="chatStore.loading" class="text-center py-4">
                <v-progress-circular
                    indeterminate
                    color="green"
                ></v-progress-circular>
            </div>

            <!-- Messages -->
            <div v-else class="messages-list">
                <div
                    v-for="message in chatStore.messages"
                    :key="message._id"
                    class="message-bubble"
                    :class="{ 'own-message': isOwnMessage(message) }"
                    @contextmenu.prevent="handleOpenContextMenu($event, message)"
                >
                    <!-- En-tête du message (expéditeur) -->
                    <div
                        v-if="!isOwnMessage(message)"
                        class="message-header"
                    >
                        <span class="message-sender">
                            {{ message.sender?.username }}
                        </span>
                    </div>

                    <!-- Contenu du message -->
                    <div class="message-content">
                        <span v-if="message.deleted" class="text-muted">
                            Message supprimé
                        </span>
                    <template v-else-if="message.media && message.media.length">
                      <div class="media-grid">
                        <div
                          v-for="m in message.media"
                          :key="m._id"
                          :class="['media-item', { image: m.type==='image', video: m.type==='video' }]"
                          @click="m.type==='image' ? openMedia(m) : (m.type==='video' ? openMedia(m) : null)"
                        >
                          <template v-if="m.type==='image'">
                            <img
                              :src="inlineSrc[m._id] || thumbSrc[m._id]"
                              :alt="m.originalFilename"
                              class="inline-image"
                              @load="() => onImgLoaded(m)"
                            />
                            <v-progress-circular
                              v-if="loadingImg[m._id] && !inlineSrc[m._id]"
                              indeterminate
                              color="green"
                              size="20"
                              class="loading-indicator"
                            />
                          </template>
                          <template v-else-if="m.type==='video' && m.thumbnailFilename">
                            <div class="video-thumb">
                              <img :src="thumbSrc[m._id]" :alt="m.originalFilename" />
                              <v-icon class="play-icon">mdi-play-circle-outline</v-icon>
                            </div>
                          </template>
                          <template v-else>
                            <div class="file-doc" @click.stop="downloadMedia(m)">
                              <v-icon>mdi-file-document</v-icon>
                              <span class="filename">{{ m.originalFilename }}</span>
                            </div>
                          </template>
                        </div>
                      </div>
                      <div v-if="message.content" class="text-part">{{ message.content }}</div>
                    </template>
                    <template v-else>
                        {{ message.content }}
                        <small
                            v-if="message.edited"
                            class="text-caption edited-indicator"
                        >
                            (modifié)
                        </small>
                    </template>
                  </div>

                    <!-- Heure et statut -->
                    <div class="message-time">
                        {{ formatTime(message.createdAt) }}
                        <v-icon v-if="isOwnMessage(message) && message.status" size="16" :color="getStatusColor(message.status)" class="ml-1">
                            {{ getStatusIcon(message.status) }}
                        </v-icon>
                    </div>

                    <!-- Réactions -->
                    <div
                        v-if="hasReactions(message)"
                        class="message-reactions"
                    >
                        <div
                            v-for="(group, idx) in getGroupedReactions(message.reactions)"
                            :key="idx"
                            class="reaction-bubble"
                            :title="`${group.count} réaction(s)`"
                            :class="{ 'self-reacted': userReactedWith(message, group.emoji) }"
                            @click.stop="toggleReaction(message, group.emoji)"
                        >
                            {{ group.emoji }} {{ group.count }}
                        </div>
                        <v-btn
                            icon
                            size="small"
                            title="Réagir avec 👍"
                            @click.stop="handleReact(message, '👍')"
                        >
                            <v-icon size="small">mdi-thumb-up-outline</v-icon>
                        </v-btn>
                    </div>
                </div>
            </div>
        </v-card-text>

        <!-- Menu contextuel -->
        <div
            v-if="contextMenu.visible"
            class="message-context-menu"
            :style="contextMenuStyle"
            @click.stop
        >
            <v-list dense>
                <v-list-item
                    v-if="canEditMessage"
                    @click="handleContextEdit"
                >
                    <template #prepend>
                        <v-icon size="small">mdi-pencil</v-icon>
                    </template>
                    <v-list-item-title>Modifier</v-list-item-title>
                </v-list-item>

                <v-list-item
                    v-if="canDeleteMessage"
                    @click="handleContextDelete"
                >
                    <template #prepend>
                        <v-icon size="small">mdi-delete</v-icon>
                    </template>
                    <v-list-item-title>Supprimer</v-list-item-title>
                </v-list-item>

                <v-divider v-if="canEditMessage || canDeleteMessage"></v-divider>

                <v-list-item @click="handleContextReact('👍')">
                    <template #prepend>
                        <span class="emoji-icon">👍</span>
                    </template>
                    <v-list-item-title>Réagir</v-list-item-title>
                </v-list-item>

                <v-list-item @click="handleContextReact('❤️')">
                    <template #prepend>
                        <span class="emoji-icon">❤️</span>
                    </template>
                    <v-list-item-title>Aimer</v-list-item-title>
                </v-list-item>

                <v-list-item @click="handleContextReact('😂')">
                    <template #prepend>
                        <span class="emoji-icon">😂</span>
                    </template>
                    <v-list-item-title>Rire</v-list-item-title>
                </v-list-item>
            </v-list>
        </div>

        <!-- user profile modal for header avatar -->
        <user-profile-modal v-if="selectedUser" v-model="showProfile" :user="selectedUser" />
        <media-preview-modal v-model="showPreview" :media="previewMedia" />
    </v-card>
</template>

<script setup>
import {computed, ref, watch, nextTick, onMounted, onUnmounted, reactive, onBeforeUnmount} from 'vue';
import {useChatStore} from '../store/index.js';
import {useAuthStore} from '../store/index.js';
import {formatDateTimeISO} from '../utils/date.js';
import UserProfileModal from './UserProfileModal.vue';
import {messageAPI} from '../services/api.js';
import MediaPreviewModal from './MediaPreviewModal.vue';
import mediaAPI from '../services/mediaApi.js';

// Stores
const chatStore = useChatStore();
const authStore = useAuthStore();

// Refs
const messageContainer = ref(null);
const showProfile = ref(false);
const selectedUser = ref(null);
const showPreview = ref(false);
const previewMedia = ref(null);

// Map des URLs objets pour affichage inline des images
const inlineSrc = reactive({});
const loadingImg = reactive({});
const thumbSrc = reactive({});

async function loadInlineImage(m) {
  if (!m || m.type !== 'image') return;
  if (inlineSrc[m._id] || loadingImg[m._id]) return;
  loadingImg[m._id] = true;
  try {
    const res = await mediaAPI.view(m._id);
    const blob = new Blob([res.data], { type: res.headers['content-type'] || 'image/*' });
    inlineSrc[m._id] = URL.createObjectURL(blob);
  } catch (e) {
    console.error('Inline image load error', e);
  } finally {
    loadingImg[m._id] = false;
  }
}

async function loadThumb(m) {
  if (!m || !m.thumbnailFilename) return;
  if (thumbSrc[m._id]) return;
  try {
    const res = await mediaAPI.thumbnail(m._id);
    const blob = new Blob([res.data], { type: res.headers['content-type'] || 'image/jpeg' });
    thumbSrc[m._id] = URL.createObjectURL(blob);
  } catch (e) {
    console.error('Thumbnail load error', e);
  }
}

function onImgLoaded(m) {
  // hook si besoin (ex: mesurer dimensions)
}

function openMedia(m) {
  previewMedia.value = m;
  showPreview.value = true;
}

async function downloadMedia(m) {
  try {
    const res = await mediaAPI.download(m._id);
    const blob = new Blob([res.data], { type: res.headers['content-type'] });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = m.originalFilename;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Download media error', e);
  }
}

// Précharger les images inline à chaque mise à jour de la liste
watch(() => chatStore.messages, (msgs) => {
  if (!Array.isArray(msgs)) return;
  for (const msg of msgs) {
    if (msg.media && msg.media.length) {
      for (const m of msg.media) {
        if (m.thumbnailFilename) loadThumb(m);
        if (m.type === 'image') loadInlineImage(m);
      }
    }
  }
}, { immediate: true, deep: true });

// Nettoyer les URLs objets pour éviter les leaks
function revokeAllInline() {
  for (const id of Object.keys(inlineSrc)) {
    try { URL.revokeObjectURL(inlineSrc[id]); } catch {}
    delete inlineSrc[id];
  }
  for (const id of Object.keys(thumbSrc)) {
    try { URL.revokeObjectURL(thumbSrc[id]); } catch {}
    delete thumbSrc[id];
  }
}

onBeforeUnmount(() => {
  revokeAllInline();
});

// Context menu state
const contextMenu = ref({
    visible: false,
    x: 0,
    y: 0,
    message: null
});

// Constants
const CONTEXT_MENU_WIDTH = 160;
const CONTEXT_MENU_HEIGHT = 200;
const CONTEXT_MENU_PADDING = 8;

// ============================================================================
// COMPUTED PROPERTIES - Informations sur la conversation
// ============================================================================

const conversationName = computed(() => {
    if (!chatStore.currentConversation) return '';

    if (chatStore.currentConversation.isGroup) {
        return chatStore.currentConversation.groupName || 'Groupe sans nom';
    }

    const other = otherParticipant.value;
    return other?.username || 'Utilisateur inconnu';
});

const conversationInitial = computed(() => {
    return conversationName.value[0]?.toUpperCase() ?? '?';
});

const otherParticipant = computed(() => {
    if (!chatStore.currentConversation || chatStore.currentConversation.isGroup) {
        return null;
    }

    return chatStore.currentConversation.participants?.find(p => p._id !== authStore.user._id) ?? null;
});

const otherParticipantId = computed(() => {
    const conversation = chatStore.currentConversation;
    if (!conversation?.participants) return null;

    const other = conversation.participants.find(p => {
        if (!p) return false;
        if (typeof p === 'string') return p !== authStore.user._id;
        return p._id && p._id !== authStore.user._id;
    });

    if (!other) return null;
    return typeof other === 'string' ? other : (other._id ?? null);
});

const isParticipantOnline = computed(() => {
    const id = otherParticipantId.value;
    return id ? chatStore.onlineUsers.includes(id) : false;
});

const participantLastSeen = computed(() => {
    const id = otherParticipantId.value;
    if (!id) return 'Jamais vu';

    // Chercher dans le store d'abord
    const fromStore = chatStore.users.find(u => u._id === id);
    if (fromStore?.lastSeen) {
        return formatDateTimeISO(fromStore.lastSeen);
    }

    // Fallback sur l'objet participant
    const participant = chatStore.currentConversation?.participants.find(p => {
        if (typeof p === 'string') return p === id;
        return p._id === id;
    });

    return participant?.lastSeen ? formatDateTimeISO(participant.lastSeen) : 'Jamais vu';
});

// ============================================================================
// COMPUTED PROPERTIES - Menu contextuel
// ============================================================================

const contextMenuStyle = computed(() => ({
    top: `${contextMenu.value.y}px`,
    left: `${contextMenu.value.x}px`
}));

const canEditMessage = computed(() => {
    const message = contextMenu.value.message;
    return message && !message.deleted && message.sender?._id === authStore.user._id;
});

const canDeleteMessage = computed(() => {
    const message = contextMenu.value.message;
    return message && !message.deleted && message.sender?._id === authStore.user._id;
});

// ============================================================================
// MÉTHODES - Utilitaires
// ============================================================================

const isOwnMessage = (message) => {
    return message?.sender?._id === authStore.user._id;
};

const hasReactions = (message) => {
    return !message.deleted && message.reactions && message.reactions.length > 0;
};

const getStatusIcon = (status) => {
    switch(status) {
        case 'pending': return 'mdi-clock-outline';
        case 'sent': return 'mdi-check';
        case 'delivered': return 'mdi-check-all';
        case 'read': return 'mdi-check-all';
        default: return 'mdi-check';
    }
};

const getStatusColor = (status) => {
    switch(status) {
        case 'pending': return 'grey';
        case 'sent': return 'grey';
        case 'delivered': return 'grey';
        case 'read': return 'blue';
        default: return 'grey';
    }
};

// new helper: check if current user reacted with a specific emoji
const userReactedWith = (message, emoji) => {
    if (!message || !message.reactions) return false;
    return (message.reactions || []).some(r => {
        const e = r.emoji || r;
        const uid = r.user?._id || r.user;
        return e === emoji && String(uid) === String(authStore.user._id);
    });
};

// toggle reaction (optimistic) when clicking on grouped reaction
const toggleReaction = async(message, emoji) => {
    if (!message || message.deleted) return;

    try {
        // optimistic UI: compute expected server result locally
        const already = userReactedWith(message, emoji);

        // Prepare a shallow clone to modify locally
        const cloned = JSON.parse(JSON.stringify(message));
        cloned.reactions = cloned.reactions || [];

        if (already) {
            // remove current user's reaction for this emoji
            const removeIdx = cloned.reactions.findIndex(r => {
                const e = r.emoji || r;
                const uid = r.user?._id || r.user;
                return e === emoji && String(uid) === String(authStore.user._id);
            });
            if (removeIdx !== -1) cloned.reactions.splice(removeIdx, 1);
        } else {
            // add or replace reaction for user
            const existingIdx = cloned.reactions.findIndex(r => String(r.user?._id || r.user) === String(authStore.user._id));
            if (existingIdx !== -1) {
                // replace emoji
                cloned.reactions[existingIdx].emoji = emoji;
            } else {
                cloned.reactions.push({ user: { _id: authStore.user._id, username: authStore.user.username }, emoji });
            }
        }

        // update local store optimistically
        chatStore.reactMessageInStore(cloned);

        // call backend
        const response = await messageAPI.reactMessage(message._id, emoji);
        // reconcile with server response
        chatStore.reactMessageInStore(response.data);
    } catch (error) {
        console.error('Toggle reaction error:', error);
        // Optionally: refetch message or notify user
    }
};

const formatTime = (timestamp) => {
    if (!timestamp) return '';

    try {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error('Erreur de formatage de l\'heure:', error);
        return '';
    }
};

const getGroupedReactions = (reactions) => {
    const reactionMap = new Map();

    (reactions || []).forEach(reaction => {
        if (!reaction) return;

        const emoji = reaction.emoji || reaction;
        const count = reactionMap.get(emoji) || 0;
        reactionMap.set(emoji, count + 1);
    });

    return Array.from(reactionMap.entries()).map(([emoji, count]) => ({
        emoji,
        count
    }));
};

const scrollToBottom = async() => {
    await nextTick();

    if (!messageContainer.value) return;

    const element = messageContainer.value.$el || messageContainer.value;
    if (element) {
        element.scrollTop = element.scrollHeight;
    }
};

// ============================================================================
// MÉTHODES - Gestion du profil utilisateur
// ============================================================================

const handleOpenProfile = (user) => {
    if (!user) return;

    // Chercher les informations complètes de l'utilisateur
    selectedUser.value = chatStore.users.find(u => u._id === user._id) || user;
    showProfile.value = true;
};

// ============================================================================
// MÉTHODES - Gestion des messages
// ============================================================================

const handleStartEdit = (message) => {
    if (!message || message.deleted) return;

    chatStore.setEditingMessage({...message});
};

const handleDeleteMessage = async(message) => {
    if (!message || message.deleted) return;

    if (!confirm('Êtes-vous sûr de vouloir supprimer ce message ?')) {
        return;
    }

    try {
        const response = await messageAPI.deleteMessage(message._id);
        chatStore.updateMessageInStore(response.data);
    } catch (error) {
        console.error('Erreur lors de la suppression du message:', error);
        // Afficher une notification d'erreur à l'utilisateur
    }
};

const handleReact = async(message, emoji) => {
    if (!message || !emoji || message.deleted) return;

    try {
        const response = await messageAPI.reactMessage(message._id, emoji);
        chatStore.reactMessageInStore(response.data);
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la réaction:', error);
    }
};

// ============================================================================
// MÉTHODES - Menu contextuel
// ============================================================================

const handleOpenContextMenu = (event, message) => {
    if (!message) return;

    // Calculer la position du menu en restant dans le viewport
    const x = Math.min(window.innerWidth - CONTEXT_MENU_WIDTH - CONTEXT_MENU_PADDING, event.clientX);
    const y = Math.min(window.innerHeight - CONTEXT_MENU_HEIGHT - CONTEXT_MENU_PADDING, event.clientY);

    contextMenu.value = {
        visible: true,
        x,
        y,
        message
    };
};

const closeContextMenu = () => {
    contextMenu.value = {
        visible: false,
        x: 0,
        y: 0,
        message: null
    };
};

const handleContextEdit = () => {
    if (!contextMenu.value.message) {
        return closeContextMenu();
    }

    handleStartEdit(contextMenu.value.message);
    closeContextMenu();
};

const handleContextDelete = async() => {
    if (!contextMenu.value.message) {
        return closeContextMenu();
    }

    await handleDeleteMessage(contextMenu.value.message);
    closeContextMenu();
};

const handleContextReact = (emoji) => {
    if (!contextMenu.value.message) {
        return closeContextMenu();
    }

    handleReact(contextMenu.value.message, emoji);
    closeContextMenu();
};

// ============================================================================
// EVENT HANDLERS - Événements globaux
// ============================================================================

const handleGlobalClick = (event) => {
    if (!contextMenu.value.visible) return;

    // Vérifier si le clic est à l'intérieur du menu
    const menuElement = document.querySelector('.message-context-menu');
    if (menuElement?.contains(event.target)) return;

    closeContextMenu();
};

const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
        closeContextMenu();
    }
};

// ============================================================================
// LIFECYCLE HOOKS
// ============================================================================

onMounted(() => {
    scrollToBottom();

    // Écouter les événements globaux
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
    // Nettoyer les écouteurs d'événements
    window.removeEventListener('click', handleGlobalClick);
    window.removeEventListener('keydown', handleKeyDown);
});

// ============================================================================
// WATCHERS
// ============================================================================

watch(() => chatStore.messages.length, () => {
    scrollToBottom();
});

watch(() => chatStore.currentConversation, () => {
    scrollToBottom();
    closeContextMenu();
});
const mediaThumbUrl = (conversationId, thumbName, mediaId) => {
  return `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/media/${mediaId}/thumbnail`;
};
</script>

<style scoped>
.message-list{
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
}

.conversation-header{
    padding: 8px 12px;
    border-bottom: 1px solid #e8e8e8;
    background-color: #ffffff;
}

.cursor-pointer{
    cursor: pointer;
}

.header-info{
    flex: 1;
    min-width: 0;
}

.conversation-title{
    font-weight: 700;
    font-size: 1rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.header-actions{
    display: flex;
    gap: 4px;
}

.empty-state{
    display: flex;
    align-items: center;
    justify-content: center;
    flex-grow: 1;
    min-height: 300px;
}

.messages-container{
    flex: 1 1 auto;
    padding: 12px;
    background-color: #fafafa;
    min-height: 0;
    max-height: calc(100vh - 168px);
    overflow-y: auto;
    overflow-x: hidden;
}

.messages-list{
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.message-bubble{
    padding: 10px 14px;
    border-radius: 10px;
    max-width: 70%;
    word-wrap: break-word;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    background-color: #ffffff;
    align-self: flex-start;
    transition: box-shadow 0.2s ease;
}

.message-bubble:hover{
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.message-bubble.own-message{
    background-color: #e6f7ea;
    align-self: flex-end;
    margin-left: auto;
}

.message-header{
    font-size: 12px;
    color: #075e54;
    font-weight: 600;
    margin-bottom: 6px;
}

.message-sender{
    cursor: default;
}

.message-content{
    font-size: 14px;
    line-height: 1.5;
    margin-bottom: 6px;
    word-break: break-word;
}

.edited-indicator{
    margin-left: 6px;
    color: #9e9e9e;
    font-style: italic;
}

.text-muted{
    color: #9e9e9e;
    font-style: italic;
}

.message-time{
    font-size: 11px;
    color: #9e9e9e;
    text-align: right;
}

.message-reactions{
    margin-top: 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
}

.reaction-bubble{
    background: #f0f0f0;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    cursor: default;
    transition: background-color 0.2s ease;
}

.reaction-bubble:hover{
    background: #e0e0e0;
}

.reaction-bubble.self-reacted{
    background: #d1e7dd;
    color: #0f5132;
    font-weight: 500;
}

.message-context-menu{
    position: fixed;
    z-index: 2500;
    background: white;
    border: 1px solid rgba(0, 0, 0, 0.08);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
    padding: 4px;
    border-radius: 8px;
    min-width: 160px;
}

.emoji-icon{
    font-size: 18px;
    display: inline-block;
    margin-right: 4px;
}

/* Scrollbar personnalisée */
.messages-container::-webkit-scrollbar{
    width: 6px;
}

.messages-container::-webkit-scrollbar-track{
    background: transparent;
}

.messages-container::-webkit-scrollbar-thumb{
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb:hover{
    background: rgba(0, 0, 0, 0.3);
}

.media-grid { display:flex; flex-wrap:wrap; gap:8px; }
.media-item { position:relative; background:#f0f0f0; border-radius:8px; overflow:hidden; cursor:pointer; display:flex; align-items:center; justify-content:center; }
.media-item.image .inline-image { width:100%; height:auto; display:block; object-fit:contain; }
.loading-indicator { position:absolute; bottom:6px; right:6px; }
</style>
