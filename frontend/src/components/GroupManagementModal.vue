<template>
  <v-dialog v-model="localShow" max-width="600px" @click:outside="close">
    <v-card>
      <v-card-title class="d-flex align-center">
        <span class="text-h5">{{ isNewGroup ? 'Create Group' : 'Group Settings' }}</span>
        <v-spacer></v-spacer>
        <v-btn icon @click="close">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text>
        <v-tabs v-if="!isNewGroup" v-model="currentTab">
          <v-tab value="info">Info</v-tab>
          <v-tab value="members">Members</v-tab>
          <v-tab value="settings">Settings</v-tab>
        </v-tabs>

        <v-window v-model="currentTab" class="mt-4">
          <v-window-item value="info">
            <v-text-field
              v-model="groupData.groupName"
              label="Group Name"
              :readonly="!isAdmin && !isNewGroup"
              :error-messages="errors.groupName"
            ></v-text-field>

            <v-textarea
              v-model="groupData.groupDescription"
              label="Description"
              rows="3"
              :readonly="!isAdmin && !isNewGroup"
            ></v-textarea>

            <v-text-field
              v-model="groupData.groupAvatar"
              label="Group Avatar URL"
              :readonly="!isAdmin && !isNewGroup"
            ></v-text-field>

            <v-btn
              v-if="isAdmin && !isNewGroup"
              color="primary"
              @click="updateGroupInfo"
              :loading="loading"
              class="mt-2"
            >
              Save Changes
            </v-btn>
          </v-window-item>

          <v-window-item value="members">
            <v-list>
              <v-list-item
                v-for="member in conversation.participants"
                :key="member._id"
              >
                <template v-slot:prepend>
                  <v-avatar :color="member.avatar ? 'transparent' : 'primary'">
                    <v-img v-if="member.avatar" :src="member.avatar"></v-img>
                    <span v-else class="text-white">{{ member.username[0].toUpperCase() }}</span>
                  </v-avatar>
                </template>

                <v-list-item-title>{{ member.username }}</v-list-item-title>
                <v-list-item-subtitle>
                  <v-chip v-if="isCreator(member._id)" size="x-small" color="success">Creator</v-chip>
                  <v-chip v-else-if="isAdminUser(member._id)" size="x-small" color="primary">Admin</v-chip>
                  <v-chip v-else-if="isModerator(member._id)" size="x-small" color="info">Moderator</v-chip>
                </v-list-item-subtitle>

                <template v-slot:append v-if="isAdmin && member._id !== currentUserId">
                  <v-menu>
                    <template v-slot:activator="{ props }">
                      <v-btn icon v-bind="props">
                        <v-icon>mdi-dots-vertical</v-icon>
                      </v-btn>
                    </template>
                    <v-list>
                      <v-list-item v-if="!isAdminUser(member._id)" @click="promoteToAdmin(member._id)">
                        <v-list-item-title>Promote to Admin</v-list-item-title>
                      </v-list-item>
                      <v-list-item @click="removeMember(member._id)" class="text-error">
                        <v-list-item-title>Remove</v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </template>
              </v-list-item>
            </v-list>

            <v-divider class="my-4"></v-divider>

            <v-autocomplete
              v-if="isAdmin"
              v-model="selectedUsers"
              :items="availableUsers"
              item-title="username"
              item-value="_id"
              label="Add Members"
              multiple
              chips
              closable-chips
            ></v-autocomplete>

            <v-btn
              v-if="isAdmin && selectedUsers.length > 0"
              color="primary"
              @click="addMembers"
              :loading="loading"
            >
              Add Members
            </v-btn>
          </v-window-item>

          <v-window-item value="settings">
            <v-switch
              v-model="notificationSettings.muted"
              label="Mute Notifications"
              @change="updateNotifications"
            ></v-switch>

            <v-text-field
              v-if="notificationSettings.muted"
              v-model="notificationSettings.muteUntil"
              label="Mute Until"
              type="datetime-local"
              @change="updateNotifications"
            ></v-text-field>
          </v-window-item>
        </v-window>

        <v-window v-if="isNewGroup" class="mt-4">
          <v-autocomplete
            v-model="selectedUsers"
            :items="allUsers"
            item-title="username"
            item-value="_id"
            label="Select Members"
            multiple
            chips
            closable-chips
            :error-messages="errors.members"
          ></v-autocomplete>

          <v-btn
            color="primary"
            @click="createGroup"
            :loading="loading"
            :disabled="!groupData.groupName || selectedUsers.length < 2"
            block
            class="mt-4"
          >
            Create Group
          </v-btn>
        </v-window>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script>
import { ref, computed, watch } from 'vue';
import { conversationAPI, userAPI } from '../services/api';
import { useAuthStore } from '../store/index';

export default {
  name: 'GroupManagementModal',
  props: {
    show: Boolean,
    conversation: {
      type: Object,
      default: null
    },
    isNewGroup: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:show', 'group-created', 'group-updated'],
  setup(props, { emit }) {
    const authStore = useAuthStore();
    const localShow = computed({
      get: () => props.show,
      set: (val) => emit('update:show', val)
    });

    const currentTab = ref('info');
    const loading = ref(false);
    const errors = ref({});
    const selectedUsers = ref([]);
    const allUsers = ref([]);

    const groupData = ref({
      groupName: '',
      groupDescription: '',
      groupAvatar: ''
    });

    const notificationSettings = ref({
      muted: false,
      muteUntil: null
    });

    const currentUserId = computed(() => authStore.user?._id);

    const isCreator = (userId) => {
      return props.conversation?.creator === userId;
    };

    const isAdminUser = (userId) => {
      return props.conversation?.admins?.includes(userId);
    };

    const isModerator = (userId) => {
      return props.conversation?.moderators?.includes(userId);
    };

    const isAdmin = computed(() => {
      return isAdminUser(currentUserId.value);
    });

    const availableUsers = computed(() => {
      const participantIds = props.conversation?.participants?.map(p => p._id) || [];
      return allUsers.value.filter(u => !participantIds.includes(u._id));
    });

    watch(() => props.show, async (newVal) => {
      if (newVal) {
        if (props.conversation && !props.isNewGroup) {
          groupData.value = {
            groupName: props.conversation.groupName || '',
            groupDescription: props.conversation.groupDescription || '',
            groupAvatar: props.conversation.groupAvatar || ''
          };

          const settings = props.conversation.notificationSettings?.get?.(currentUserId.value) || {};
          notificationSettings.value = {
            muted: settings.muted || false,
            muteUntil: settings.muteUntil || null
          };
        }

        try {
          const response = await userAPI.getAllUsers();
          allUsers.value = response.data;
        } catch (error) {
          console.error('Error loading users:', error);
        }
      }
    });

    const close = () => {
      localShow.value = false;
      errors.value = {};
      selectedUsers.value = [];
    };

    const createGroup = async () => {
      errors.value = {};

      if (!groupData.value.groupName) {
        errors.value.groupName = 'Group name is required';
        return;
      }

      if (selectedUsers.value.length < 2) {
        errors.value.members = 'At least 2 members are required';
        return;
      }

      loading.value = true;
      try {
        const response = await conversationAPI.createGroupConversation({
          participantIds: selectedUsers.value,
          groupName: groupData.value.groupName,
          groupDescription: groupData.value.groupDescription,
          groupAvatar: groupData.value.groupAvatar
        });

        emit('group-created', response.data);
        close();
      } catch (error) {
        console.error('Error creating group:', error);
        errors.value.general = error.response?.data?.message || 'Failed to create group';
      } finally {
        loading.value = false;
      }
    };

    const updateGroupInfo = async () => {
      loading.value = true;
      try {
        await conversationAPI.updateGroupInfo(props.conversation._id, {
          groupName: groupData.value.groupName,
          groupDescription: groupData.value.groupDescription,
          groupAvatar: groupData.value.groupAvatar
        });

        emit('group-updated');
      } catch (error) {
        console.error('Error updating group:', error);
      } finally {
        loading.value = false;
      }
    };

    const addMembers = async () => {
      loading.value = true;
      try {
        await conversationAPI.addGroupMembers(props.conversation._id, selectedUsers.value);
        emit('group-updated');
        selectedUsers.value = [];
      } catch (error) {
        console.error('Error adding members:', error);
      } finally {
        loading.value = false;
      }
    };

    const removeMember = async (memberId) => {
      loading.value = true;
      try {
        await conversationAPI.removeGroupMember(props.conversation._id, memberId);
        emit('group-updated');
      } catch (error) {
        console.error('Error removing member:', error);
      } finally {
        loading.value = false;
      }
    };

    const promoteToAdmin = async (memberId) => {
      loading.value = true;
      try {
        await conversationAPI.promoteToAdmin(props.conversation._id, memberId);
        emit('group-updated');
      } catch (error) {
        console.error('Error promoting member:', error);
      } finally {
        loading.value = false;
      }
    };

    const updateNotifications = async () => {
      loading.value = true;
      try {
        await conversationAPI.updateNotificationSettings(props.conversation._id, {
          muted: notificationSettings.value.muted,
          muteUntil: notificationSettings.value.muteUntil
        });
      } catch (error) {
        console.error('Error updating notifications:', error);
      } finally {
        loading.value = false;
      }
    };

    return {
      localShow,
      currentTab,
      loading,
      errors,
      selectedUsers,
      allUsers,
      groupData,
      notificationSettings,
      currentUserId,
      isCreator,
      isAdminUser,
      isModerator,
      isAdmin,
      availableUsers,
      close,
      createGroup,
      updateGroupInfo,
      addMembers,
      removeMember,
      promoteToAdmin,
      updateNotifications
    };
  }
};
</script>
