<template>
    <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="520">
        <v-card>
            <v-card-title class="d-flex align-center">
                <v-avatar size="56" class="me-4">
                    <img v-if="displayUser?.avatar" :src="displayUser.avatar" :alt="displayUser.username" />
                    <div v-else class="avatar-placeholder">{{ initials }}</div>
                </v-avatar>

                <div>
                    <div class="text-h6">{{ displayUser?.username }}</div>
                    <div class="text-caption text-grey">{{ displayUser?.email }}</div>
                </div>

                <v-spacer></v-spacer>
                <v-chip :color="isOnline ? 'success' : 'grey'" small>
                    {{ isOnline ? 'En ligne' : 'Hors ligne' }}
                </v-chip>
            </v-card-title>

            <v-card-text>
                <div class="mb-3">
                    <strong>Statut:</strong>
                    <div>{{ displayUser?.status || '-' }}</div>
                </div>

                <div>
                    <strong>Dernière vue:</strong>
                    <div>{{ lastSeenFormatted }}</div>
                </div>
            </v-card-text>

            <v-card-actions>
                <v-spacer />
                <v-btn text @click="$emit('update:modelValue', false)">Fermer</v-btn>
                <v-btn color="primary" @click="startChat">Message</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup>
import {computed, watch, ref} from 'vue';
import {useChatStore} from '../store/index.js';
import {formatDateTimeISO} from '../utils/date.js';
import {toRefs} from 'vue';
import {userAPI} from '../services/api.js';

const props = defineProps({
    modelValue: {
        type: Boolean,
        required: true
    },
    user: {
        type: Object,
        required: true
    }
});
const emits = defineEmits(['update:modelValue']);

const chatStore = useChatStore();

const {user: userRef} = toRefs(props);
const profile = ref(null);

// helper to unwrap possible ref passed as prop
const unwrapPropUser = (u) => {
    if (!u) return null;
    if (u && u._id) return u;
    // if it's a ref-like (has .value)
    if (u && u.value) return u.value;
    return u;
};

const displayUser = computed(() => {
    const base = profile.value || unwrapPropUser(userRef.value);
    return base || null;
});

const initials = computed(() => {
    const name = displayUser.value?.username || '';
    return name.split(' ').map(p => p[0] || '').slice(0, 2).join('').toUpperCase();
});

// compute lastSeen using profile, or chatStore.users, or prop
const lastSeen = computed(() => {
    if (profile.value?.lastSeen) return profile.value.lastSeen;
    const du = displayUser.value;
    if (!du) return null;
    const fromStore = chatStore.users.find(u => u._id === du._id);
    if (fromStore?.lastSeen) return fromStore.lastSeen;
    return du.lastSeen || null;
});

const lastSeenFormatted = computed(() => formatDateTimeISO(lastSeen.value));

// compute isOnline based on chatStore.onlineUsers
const isOnline = computed(() => {
    const du = displayUser.value;
    if (!du) return false;
    return chatStore.onlineUsers.includes(du._id);
});

watch(() => props.modelValue, (val) => {
    if (val) {
        (async () => {
            try {
                const resolved = unwrapPropUser(userRef.value);
                if (resolved && resolved._id) {
                    const res = await userAPI.getUserById(resolved._id);
                    profile.value = res.data;
                    return;
                }
            } catch (err) {
                console.warn('Failed to fetch user profile, falling back to provided data', err);
            }
            // fallback
            profile.value = unwrapPropUser(userRef.value);
        })();
    } else {
        // clear profile when modal closed
        profile.value = null;
    }
});

const startChat = async() => {
    const targetId = profile.value?._id || unwrapPropUser(userRef.value)?._id;
    if (!targetId) return;
    await chatStore.createOrGetConversation(targetId);
    emits('update:modelValue', false);
};
</script>

<style scoped>
.avatar-placeholder{
    width: 56px;
    height: 56px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #e0e0e0;
    color: #555;
    font-weight: 700
}
</style>
