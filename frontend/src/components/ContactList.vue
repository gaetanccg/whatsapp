<template>
  <div class="contact-list pa-2">
    <div class="search-row mb-2 d-flex align-center">
      <v-text-field
        v-model="search"
        placeholder="Rechercher des utilisateurs"
        dense
        hide-details
        rounded
        clearable
        @input="onSearch"
        class="flex-grow-1"
      />
      <v-btn icon small @click="onSearch" class="ml-2">
        <v-icon>mdi-magnify</v-icon>
      </v-btn>
    </div>

    <div v-if="loading" class="text-center py-2">Chargement...</div>

    <div v-if="searchResults.length" class="mb-3">
      <div class="section-title">Résultats</div>
      <v-list dense>
        <v-list-item v-for="user in searchResults" :key="user._id" class="py-1">
          <v-list-item-avatar>
            <img v-if="user.avatar" :src="user.avatar" alt="avatar" />
            <span v-else class="avatar-fallback">{{ user.username?.[0] || '?' }}</span>
          </v-list-item-avatar>

          <v-list-item-content>
            <v-list-item-title class="title-compact">{{ user.username }}</v-list-item-title>
            <v-list-item-subtitle class="subtitle-compact">{{ user.email }}</v-list-item-subtitle>
          </v-list-item-content>

          <v-list-item-action>
            <v-tooltip text="Ajouter">
              <template #activator="{ props }">
                <v-btn v-bind="props" icon small color="primary" @click="add(user._id)" :disabled="isContact(user._id)">
                  <v-icon>mdi-account-plus</v-icon>
                </v-btn>
              </template>
            </v-tooltip>
          </v-list-item-action>
        </v-list-item>
      </v-list>
    </div>

    <div>
      <div class="section-title">Contacts</div>
      <v-list dense>
        <v-list-item v-for="c in contacts" :key="c._id" class="py-1">
          <v-list-item-avatar>
            <img v-if="c.avatar" :src="c.avatar" alt="avatar" />
            <span v-else class="avatar-fallback">{{ c.username?.[0] || '?' }}</span>
          </v-list-item-avatar>

          <v-list-item-content>
            <v-list-item-title class="title-compact">{{ c.username }}</v-list-item-title>
            <v-list-item-subtitle class="subtitle-compact">{{ c.email }}</v-list-item-subtitle>
          </v-list-item-content>

          <v-list-item-action>
            <v-tooltip text="Ouvrir le chat">
              <template #activator="{ props }">
                <v-btn v-bind="props" icon small color="primary" @click="openChat(c._id)">
                  <v-icon>mdi-chat</v-icon>
                </v-btn>
              </template>
            </v-tooltip>

            <v-tooltip text="Supprimer">
              <template #activator="{ props }">
                <v-btn v-bind="props" icon small color="error" @click="remove(c._id)">
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </template>
            </v-tooltip>

            <v-tooltip v-if="!isBlocked(c._id)" text="Bloquer">
              <template #activator="{ props }">
                <v-btn v-bind="props" icon small color="grey" @click="block(c._id)">
                  <v-icon>mdi-block-helper</v-icon>
                </v-btn>
              </template>
            </v-tooltip>

            <v-tooltip v-else text="Débloquer">
              <template #activator="{ props }">
                <v-btn v-bind="props" icon small color="success" @click="unblock(c._id)">
                  <v-icon>mdi-lock-open</v-icon>
                </v-btn>
              </template>
            </v-tooltip>
          </v-list-item-action>
        </v-list-item>
      </v-list>
    </div>

    <!-- confirmation dialog placed at root of template -->
    <v-dialog v-model="confirmDialog" max-width="420">
      <v-card>
        <v-card-title>{{ confirmTitle }}</v-card-title>
        <v-card-text>{{ confirmText }}</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text color="grey" @click="confirmDialog = false">Annuler</v-btn>
          <v-btn color="primary" @click="runConfirm">Confirmer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore, useChatStore } from '../store/index.js';
import { useUiStore } from '../store/uiStore.js';
import { userAPI } from '../services/api.js';

const router = useRouter();
const authStore = useAuthStore();
const chatStore = useChatStore();
const uiStore = useUiStore();

const search = ref('');
const searchResults = ref([]);
const loading = ref(false);

const contacts = computed(() => authStore.contacts || []);

// confirmation dialog state
const confirmDialog = ref(false);
const confirmAction = ref(null);
const confirmPayload = ref(null);
const confirmTitle = ref('');
const confirmText = ref('');

const openConfirm = (title, text, action, payload) => {
  confirmTitle.value = title;
  confirmText.value = text;
  confirmAction.value = action;
  confirmPayload.value = payload;
  confirmDialog.value = true;
};

const emit = defineEmits(['action-complete']);

const runConfirm = async () => {
  confirmDialog.value = false;
  if (!confirmAction.value) return;
  await confirmAction.value(confirmPayload.value);
  // notify parent that an action completed (useful to close menu)
  emit('action-complete');
};

const onSearch = async () => {
  if (!search.value || search.value.length < 2) {
    searchResults.value = [];
    return;
  }
  loading.value = true;
  try {
    const res = await userAPI.searchUsers(search.value);
    // filter out current user
    searchResults.value = res.data.filter(u => u._id !== authStore.user._id);
  } catch (err) {
    console.error('Search error:', err.response?.data || err.message);
  } finally {
    loading.value = false;
  }
};

const isContact = (id) => {
  return contacts.value.some(c => c._id === id);
};

const isBlocked = (id) => {
  return authStore.user?.blocked?.includes(id) || false;
};

const add = async (id) => {
  try {
    await authStore.addContact(id);
    searchResults.value = searchResults.value.filter(u => u._id !== id);
    uiStore.showNotification('Contact ajouté', 'success');
  } catch (err) {
    uiStore.showNotification(err.response?.data?.message || 'Erreur', 'error');
  }
};

const remove = async (id) => {
  openConfirm('Supprimer le contact', 'Voulez-vous vraiment supprimer ce contact ?', async (payload) => {
    try {
      await authStore.removeContact(payload);
      uiStore.showNotification('Contact supprimé', 'success');
    } catch (err) {
      uiStore.showNotification(err.response?.data?.message || 'Erreur', 'error');
    }
  }, id);
};

const block = async (id) => {
  openConfirm('Bloquer utilisateur', 'Bloquer cet utilisateur le retirera de vos contacts.', async (payload) => {
    try {
      await authStore.blockContact(payload);
      uiStore.showNotification('Utilisateur bloqué', 'success');
    } catch (err) {
      uiStore.showNotification(err.response?.data?.message || 'Erreur', 'error');
    }
  }, id);
};

const unblock = async (id) => {
  try {
    await authStore.unblockContact(id);
    uiStore.showNotification('Utilisateur débloqué', 'success');
  } catch (err) {
    uiStore.showNotification(err.response?.data?.message || 'Erreur', 'error');
  }
};

const openChat = async (id) => {
  // Use chat store to create/get conversation and navigate to Chat view
  const conversation = await chatStore.createOrGetConversation(id);
  if (conversation) {
    // navigate to chat (if app uses routes per conversation) otherwise selection handled by store
    // router.push({ name: 'Chat', params: { id: conversation._id } });
  }
};
</script>

<style scoped>
.contact-list {
  max-height: calc(100vh - 160px);
  overflow-y: auto;
}

.search-row {
  gap: 8px;
}

.section-title {
  font-size: 0.9rem;
  color: #616161;
  margin: 6px 0;
  font-weight: 600;
}

.avatar-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e0e0e0;
  color: #424242;
  font-weight: 700;
}

.title-compact {
  font-size: 0.95rem;
}

.subtitle-compact {
  font-size: 0.75rem;
  color: #757575;
}
</style>
