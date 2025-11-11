<template>
  <v-card class="user-status-list" flat>
    <v-card-title class="bg-grey-lighten-2 text-subtitle-1">
      Online Users ({{ chatStore.onlineUsers.length }})
    </v-card-title>

    <v-list dense>
      <v-list-item
        v-for="user in onlineUsersList"
        :key="user._id"
        @click="startConversation(user._id)"
        class="user-item"
      >
        <template v-slot:prepend>
          <v-badge
            color="success"
            dot
            offset-x="10"
            offset-y="10"
          >
            <v-avatar size="32" color="green-lighten-1">
              <span class="text-white text-caption">{{ user.username[0].toUpperCase() }}</span>
            </v-avatar>
          </v-badge>
        </template>

        <v-list-item-title class="text-body-2">
          {{ user.username }}
        </v-list-item-title>
      </v-list-item>

      <v-list-item v-if="onlineUsersList.length === 0">
        <v-list-item-title class="text-center text-grey text-caption">
          No users online
        </v-list-item-title>
      </v-list-item>
    </v-list>
  </v-card>
</template>

<script setup>
import { computed } from 'vue';
import { useChatStore } from '../store/index.js';

const chatStore = useChatStore();

const onlineUsersList = computed(() => {
  return chatStore.users.filter(user =>
    chatStore.onlineUsers.includes(user._id)
  );
});

const startConversation = async (userId) => {
  await chatStore.createOrGetConversation(userId);
};
</script>

<style scoped>
.user-status-list {
  max-height: 300px;
  overflow-y: auto;
}

.user-item {
  cursor: pointer;
  transition: background-color 0.2s;
}

.user-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
}
</style>
