<template>
    <v-app>
        <v-app-bar color="green-darken-1" dark class="app-bar-compact">
            <div class="d-flex align-center left-block">
                <v-btn icon variant="text" @click="goProfile" class="mr-2" title="Mon profil">
                    <v-avatar size="36">
                        <img v-if="authStore.user?.avatar" :src="authStore.user.avatar" alt="avatar" />
                        <span v-else style="font-weight:bold;color:white">{{ authStore.user?.username?.[0] || '?' }}</span>
                    </v-avatar>
                </v-btn>
                <v-app-bar-title class="app-title">WhatsApp Clone</v-app-bar-title>
            </div>

            <v-spacer></v-spacer>

            <div class="d-flex align-center right-block">
                <!-- quick search (opens global search or focuses contact menu) -->
                <v-btn icon variant="text" title="Rechercher" @click="$emit('openSearch')">
                    <v-icon>mdi-magnify</v-icon>
                </v-btn>

                <ContactMenu />

                <v-btn icon variant="text" @click="openSessions" title="Sessions">
                    <v-icon>mdi-history</v-icon>
                </v-btn>

                <v-chip class="mx-2 username-chip" color="green-lighten-1" variant="tonal">
                    {{ authStore.user?.username }}
                </v-chip>

                <v-btn icon @click="handleLogout" title="Se déconnecter">
                    <v-icon>mdi-logout</v-icon>
                </v-btn>
            </div>

            <!-- Hamburger button for mobile -->
            <v-btn icon variant="text" class="mobile-toggle" @click="toggleSidebar">
                <v-icon>mdi-menu</v-icon>
            </v-btn>
        </v-app-bar>

        <v-main>
            <v-container fluid class="pa-0 fill-height">
                <v-row no-gutters class="fill-height">
                    <v-col cols="12" md="4" lg="3" class="chat-sidebar" :class="{ 'show': showSidebar }">
                        <ChatList />
                        <v-divider></v-divider>
                        <UserStatusList />
                    </v-col>

                    <v-col cols="12" md="8" lg="9" class="chat-main">
                        <div class="d-flex flex-column fill-height">
                            <div class="flex-grow-1 d-flex flex-column" style="overflow: hidden; min-height: 0;">
                                <MessageList />
                            </div>
                            <MessageInput />
                        </div>
                    </v-col>
                </v-row>
            </v-container>
        </v-main>

        <v-dialog v-model="showSessions" max-width="800">
            <v-card>
                <v-card-title class="d-flex align-center">
                    <v-icon class="mr-2">mdi-shield-account</v-icon>
                    Sessions & Historique
                    <v-spacer></v-spacer>
                    <v-btn icon variant="text" @click="showSessions = false">
                        <v-icon>mdi-close</v-icon>
                    </v-btn>
                </v-card-title>
                <v-divider></v-divider>
                <v-card-text>
                    <SessionManager />
                </v-card-text>
            </v-card>
        </v-dialog>

        <v-snackbar v-model="uiStore.snackbar.show" :timeout="uiStore.snackbar.timeout" :color="uiStore.snackbar.color" location="top right">
            {{ uiStore.snackbar.message }}
        </v-snackbar>
    </v-app>
</template>

<script setup>
import {ref, onMounted, onUnmounted} from 'vue';
import {useRouter} from 'vue-router';
import {useAuthStore} from '../store/index.js';
import {useChatStore} from '../store/index.js';
import {useUiStore} from '../store/uiStore.js';
import socketService from '../services/socket.js';
import ChatList from '../components/ChatList.vue';
import MessageList from '../components/MessageList.vue';
import MessageInput from '../components/MessageInput.vue';
import UserStatusList from '../components/UserStatusList.vue';
import SessionManager from '../components/SessionManager.vue';
import ContactMenu from '../components/ContactMenu.vue';

const router = useRouter();
const authStore = useAuthStore();
const chatStore = useChatStore();
const uiStore = useUiStore();
const showSessions = ref(false);
const showSidebar = ref(true);

onMounted(() => {
    const token = localStorage.getItem('token');
    if (!token) {
        router.push('/login');
        return;
    }

    socketService.connect(token);

    socketService.on('receiveMessage', (message) => {
        chatStore.addMessage(message);
    });

    socketService.on('newMessageNotification', (data) => {
        if (chatStore.currentConversation?._id !== data.conversationId) {
            chatStore.incrementUnreadCount(data.conversationId);
            uiStore.showNotification(`New message from ${data.message.sender?.username}`, 'info');
        }
    });

    socketService.on('messageEdited', (message) => {
        chatStore.updateMessageInStore(message);
    });

    socketService.on('messageDeleted', (data) => {
        // backend may emit either the full updated message or an object { messageId }
        if (!data) return;
        if (data._id) {
            // full message object
            chatStore.updateMessageInStore(data);
        } else if (data.messageId) {
            const messageId = data.messageId;
            const idx = chatStore.messages.findIndex(m => m._id === messageId);
            if (idx !== -1) {
                chatStore.messages[idx].deleted = true;
                // keep original content but indicate deleted in UI; update store
                chatStore.updateMessageInStore(chatStore.messages[idx]);
            }
        }
    });

    socketService.on('messageReaction', (message) => {
        chatStore.reactMessageInStore(message);
    });

    socketService.on('onlineUsers', (users) => {
        chatStore.updateOnlineUsers(users);
    });

    socketService.on('userStatusUpdate', (data) => {
        chatStore.updateUserStatus(data.userId, data.isOnline, data.lastSeen);
    });

    socketService.on('userTyping', (data) => {
        chatStore.setTyping(data.userId, data.username, data.conversationId, data.isTyping);
    });

    socketService.on('messagesRead', (data) => {
        const conv = chatStore.conversations.find(c => c._id === data.conversationId);
        if (conv) {
            conv.unreadCount = 0;
        }
    });

    socketService.on('error', (error) => {
        uiStore.showNotification(error.message || 'Error', 'error');
    });
});

onUnmounted(() => {
    socketService.disconnect();
});

const openSessions = () => {
    showSessions.value = true;
};

const toggleSidebar = () => {
    showSidebar.value = !showSidebar.value;
};

const handleLogout = () => {
    authStore.logout();
    router.push('/login');
};

const goProfile = () => {
    router.push('/profile');
};
</script>

<style scoped>
.app-bar-compact{
    height: 56px;
}

.app-title{
    font-weight: 700;
    font-size: 1rem;
    margin-left: 8px;
}

.username-chip{
    font-weight: 600;
    font-size: 0.9rem;
}

.chat-sidebar{
    border-right: 1px solid #e8e8e8;
}

.chat-main{
    background-color: #f5f5f5;
    /* ensure message area can grow/shrink and keep input visible */
    display: flex;
    flex-direction: column;
    /* full viewport height minus app bar */
    height: calc(100vh - 56px);
    min-height: 0;
}

/* ensure the inner container keeps flex behavior */
.d-flex.flex-column.fill-height > .flex-grow-1{
    min-height: 0;
}

/* mobile responsive: sidebar overlay and hamburger button */
.mobile-toggle{
    display: none;
}

@media (max-width: 960px){
    .mobile-toggle{
        display: inline-flex;
    }

    .chat-sidebar{
        position: fixed;
        top: 56px; /* height of app-bar */
        left: 0;
        width: 280px;
        height: calc(100vh - 56px);
        background: #ffffff;
        z-index: 60;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        transform: translateX(-100%);
        transition: transform 0.26s ease;
    }

    .chat-sidebar.show{
        transform: translateX(0);
    }

    .chat-main{
        margin-left: 0;
    }
}
</style>
