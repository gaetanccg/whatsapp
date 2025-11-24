<template>
  <v-app>
    <v-app-bar color="green-darken-1" dark>
      <v-app-bar-title>WhatsApp Clone</v-app-bar-title>
      <v-spacer></v-spacer>
      <v-btn icon variant="text" @click="openSessions">
        <v-icon>mdi-history</v-icon>
      </v-btn>
      <v-btn icon @click="goProfile" title="Mon profil">
        <v-avatar size="36">
          <img v-if="authStore.user?.avatar" :src="authStore.user.avatar" alt="avatar" />
          <span v-else style="font-weight:bold;color:white">{{ authStore.user?.username?.[0] || '?' }}</span>
        </v-avatar>
      </v-btn>
      <v-chip class="mr-2" color="green-lighten-1">
        {{ authStore.user?.username }}
      </v-chip>
      <v-btn icon @click="handleLogout">
        <v-icon>mdi-logout</v-icon>
      </v-btn>
    </v-app-bar>
    <v-app>
        <v-app-bar color="green-darken-1" dark>
            <v-app-bar-title>WhatsApp Clone</v-app-bar-title>
            <v-spacer></v-spacer>
            <v-btn icon @click="goProfile" title="Mon profil">
                <v-avatar size="36">
                    <img v-if="authStore.user?.avatar" :src="authStore.user.avatar" alt="avatar" />
                    <span v-else style="font-weight:bold;color:white">{{ authStore.user?.username?.[0] || '?' }}</span>
                </v-avatar>
            </v-btn>
            <v-chip class="mr-2" color="green-lighten-1">
                {{ authStore.user?.username }}
            </v-chip>
            <v-btn icon @click="handleLogout">
                <v-icon>mdi-logout</v-icon>
            </v-btn>
        </v-app-bar>

        <v-main>
            <v-container fluid class="pa-0 fill-height">
                <v-row no-gutters class="fill-height">
                    <v-col cols="12" md="4" lg="3" class="chat-sidebar">
                        <ChatList />
                        <v-divider></v-divider>
                        <UserStatusList />
                    </v-col>

                    <v-col cols="12" md="8" lg="9" class="chat-main">
                        <div class="d-flex flex-column fill-height">
                            <div class="flex-grow-1" style="overflow: hidden;">
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
          <v-icon class="mr-2">mdi-shield-account</v-icon> Sessions & Historique
          <v-spacer></v-spacer>
          <v-btn icon variant="text" @click="showSessions=false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text>
          <SessionManager />
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-snackbar
      v-model="showNotification"
      :timeout="3000"
      color="green"
      location="top right"
    >
      {{ notificationMessage }}
    </v-snackbar>
  </v-app>
        <v-snackbar
            v-model="showNotification"
            :timeout="3000"
            color="green"
            location="top right"
        >
            {{ notificationMessage }}
        </v-snackbar>
    </v-app>
</template>

<script setup>
import {ref, onMounted, onUnmounted} from 'vue';
import {useRouter} from 'vue-router';
import {useAuthStore} from '../store/index.js';
import {useChatStore} from '../store/index.js';
import socketService from '../services/socket.js';
import ChatList from '../components/ChatList.vue';
import MessageList from '../components/MessageList.vue';
import MessageInput from '../components/MessageInput.vue';
import UserStatusList from '../components/UserStatusList.vue';
import SessionManager from '../components/SessionManager.vue';

const router = useRouter();
const authStore = useAuthStore();
const chatStore = useChatStore();
const showNotification = ref(false);
const notificationMessage = ref('');
const showSessions = ref(false);

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

            notificationMessage.value = `New message from ${data.message.sender?.username}`;
            showNotification.value = true;
        }
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
        notificationMessage.value = error.message;
        showNotification.value = true;
    });
});

onUnmounted(() => {
    socketService.disconnect();
});

const openSessions = () => {
  showSessions.value = true;
};

const handleLogout = async () => {
  await authStore.backendLogout();
  router.push('/login');
const handleLogout = () => {
    authStore.logout();
    router.push('/login');
};

const goProfile = () => {
    router.push('/profile');
};
</script>

<style scoped>
.chat-sidebar{
    border-right: 1px solid #e0e0e0;
    background-color: white;
    overflow-y: auto;
}

.chat-main{
    background-color: #f5f5f5;
}

.fill-height{
    height: 100vh;
}
</style>
