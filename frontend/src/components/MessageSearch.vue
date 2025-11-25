<template>
  <v-dialog v-model="localShow" max-width="800px" @click:outside="close">
    <v-card>
      <v-card-title class="d-flex align-center">
        <span class="text-h5">Search Messages</span>
        <v-spacer></v-spacer>
        <v-btn icon @click="close">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text>
        <v-text-field
          v-model="searchQuery"
          label="Search messages"
          prepend-inner-icon="mdi-magnify"
          clearable
          @keyup.enter="performSearch"
          @click:clear="clearSearch"
        ></v-text-field>

        <v-row class="mt-2">
          <v-col cols="12" md="6">
            <v-select
              v-model="searchFilters.conversationId"
              :items="conversations"
              item-title="displayName"
              item-value="_id"
              label="Filter by Conversation"
              clearable
            ></v-select>
          </v-col>

          <v-col cols="12" md="6">
            <v-autocomplete
              v-model="searchFilters.senderId"
              :items="users"
              item-title="username"
              item-value="_id"
              label="Filter by Sender"
              clearable
            ></v-autocomplete>
          </v-col>
        </v-row>

        <v-btn
          color="primary"
          @click="performSearch"
          :loading="loading"
          :disabled="!searchQuery"
          block
        >
          Search
        </v-btn>

        <v-divider class="my-4"></v-divider>

        <v-list v-if="searchResults.length > 0">
          <v-list-item
            v-for="message in searchResults"
            :key="message._id"
            @click="goToMessage(message)"
            class="message-result"
          >
            <template v-slot:prepend>
              <v-avatar :color="message.sender.avatar ? 'transparent' : 'primary'">
                <v-img v-if="message.sender.avatar" :src="message.sender.avatar"></v-img>
                <span v-else class="text-white">{{ message.sender.username[0].toUpperCase() }}</span>
              </v-avatar>
            </template>

            <v-list-item-title>{{ message.sender.username }}</v-list-item-title>
            <v-list-item-subtitle>
              <div class="message-preview">{{ message.content }}</div>
              <div class="text-caption">
                {{ formatConversationName(message.conversation) }} •
                {{ formatDate(message.createdAt) }}
              </div>
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>

        <div v-else-if="searched && !loading" class="text-center py-8 text-grey">
          No messages found
        </div>

        <div v-if="hasMore" class="text-center mt-4">
          <v-btn
            variant="text"
            @click="loadMore"
            :loading="loading"
          >
            Load More
          </v-btn>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script>
import { ref, computed, watch } from 'vue';
import { messageAPI, userAPI } from '../services/api';
import { useAuthStore } from '../store/index';
import { formatRelativeTime } from '../utils/date';

export default {
  name: 'MessageSearch',
  props: {
    show: Boolean,
    conversations: {
      type: Array,
      default: () => []
    }
  },
  emits: ['update:show', 'message-selected'],
  setup(props, { emit }) {
    const authStore = useAuthStore();
    const localShow = computed({
      get: () => props.show,
      set: (val) => emit('update:show', val)
    });

    const searchQuery = ref('');
    const searchFilters = ref({
      conversationId: null,
      senderId: null
    });
    const searchResults = ref([]);
    const loading = ref(false);
    const searched = ref(false);
    const skip = ref(0);
    const limit = 50;
    const hasMore = ref(false);
    const users = ref([]);

    watch(() => props.show, async (newVal) => {
      if (newVal) {
        try {
          const response = await userAPI.getAllUsers();
          users.value = response.data;
        } catch (error) {
          console.error('Error loading users:', error);
        }
      }
    });

    const formatConversationName = (conversation) => {
      if (!conversation) return '';
      if (conversation.isGroup) {
        return conversation.groupName || 'Group';
      }
      const otherParticipant = conversation.participants?.find(
        p => p._id !== authStore.user?._id
      );
      return otherParticipant?.username || 'Unknown';
    };

    const formatDate = (date) => {
      return formatRelativeTime(date);
    };

    const performSearch = async () => {
      if (!searchQuery.value) return;

      loading.value = true;
      searched.value = true;
      skip.value = 0;
      searchResults.value = [];

      try {
        const params = {
          query: searchQuery.value,
          limit,
          skip: skip.value
        };

        if (searchFilters.value.conversationId) {
          params.conversationId = searchFilters.value.conversationId;
        }

        if (searchFilters.value.senderId) {
          params.senderId = searchFilters.value.senderId;
        }

        const response = await messageAPI.searchMessages(params);
        searchResults.value = response.data;
        hasMore.value = response.data.length === limit;
      } catch (error) {
        console.error('Error searching messages:', error);
      } finally {
        loading.value = false;
      }
    };

    const loadMore = async () => {
      if (!searchQuery.value || loading.value) return;

      loading.value = true;
      skip.value += limit;

      try {
        const params = {
          query: searchQuery.value,
          limit,
          skip: skip.value
        };

        if (searchFilters.value.conversationId) {
          params.conversationId = searchFilters.value.conversationId;
        }

        if (searchFilters.value.senderId) {
          params.senderId = searchFilters.value.senderId;
        }

        const response = await messageAPI.searchMessages(params);
        searchResults.value.push(...response.data);
        hasMore.value = response.data.length === limit;
      } catch (error) {
        console.error('Error loading more messages:', error);
      } finally {
        loading.value = false;
      }
    };

    const clearSearch = () => {
      searchQuery.value = '';
      searchResults.value = [];
      searched.value = false;
      skip.value = 0;
      hasMore.value = false;
    };

    const goToMessage = (message) => {
      emit('message-selected', message);
      close();
    };

    const close = () => {
      localShow.value = false;
      clearSearch();
    };

    return {
      localShow,
      searchQuery,
      searchFilters,
      searchResults,
      loading,
      searched,
      hasMore,
      users,
      formatConversationName,
      formatDate,
      performSearch,
      loadMore,
      clearSearch,
      goToMessage,
      close
    };
  }
};
</script>

<style scoped>
.message-result {
  cursor: pointer;
}

.message-result:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.message-preview {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 500px;
}
</style>
