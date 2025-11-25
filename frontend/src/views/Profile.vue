<template>
    <v-container class="py-6" fluid>
        <v-row justify="center">
            <v-col cols="12" md="10" lg="8">
                <v-card>
                    <v-card-title>
                        <div class="d-flex align-center w-100">
                            <v-badge
                                overlap
                                bordered
                                :color="user?.isOnline ? 'success' : 'grey'"
                                dot
                                offset-x="12"
                                offset-y="12"
                            >
                                <v-avatar size="64" class="me-4">
                                    <img v-if="preview || form.avatar" :src="preview || form.avatar" :alt="`${form.username || user?.username || 'Avatar'}`" />
                                    <div v-else class="avatar-placeholder">{{ initials }}</div>
                                </v-avatar>
                            </v-badge>

                            <div class="flex-grow-1">
                                <div class="text-h6">Mon profil</div>
                                <div class="text-subtitle-2">Gérez vos informations et votre photo de profil</div>
                            </div>

                            <v-btn color="error" variant="tonal" @click="onDelete" class="ml-4">Supprimer</v-btn>
                        </div>
                    </v-card-title>

                    <v-card-text>
                        <v-form @submit.prevent="onSubmit" ref="formRef">
                            <v-row>
                                <v-col cols="12" md="4" class="d-flex flex-column align-center">
                                    <v-avatar size="120" class="mb-4 profile-avatar">
                                        <img v-if="preview || form.avatar" :src="preview || form.avatar" :alt="`${form.username || user?.username || 'Avatar'}`" />
                                        <div v-else class="avatar-placeholder-large">{{ initials }}</div>
                                    </v-avatar>

                                    <v-file-input
                                        accept="image/*"
                                        show-size
                                        truncate-length="15"
                                        placeholder="Choisir une photo"
                                        @change="onFileChange"
                                        prepend-icon="mdi-camera"
                                        density="compact"
                                        class="mb-2"
                                    />

                                    <v-btn
                                        size="small"
                                        variant="text"
                                        color="error"
                                        v-if="(preview || form.avatar)"
                                        @click="removeAvatar"
                                        prepend-icon="mdi-delete"
                                    >
                                        Supprimer la photo
                                    </v-btn>

                                    <v-divider class="my-4"></v-divider>

                                    <div class="text-center">
                                        <v-chip
                                            :color="user?.isOnline ? 'success' : 'grey'"
                                            size="small"
                                            class="mb-2"
                                        >
                                            <v-icon start>mdi-circle</v-icon>
                                            {{ user?.isOnline ? 'En ligne' : 'Hors ligne' }}
                                        </v-chip>
                                        <div class="text-caption text-grey">
                                            Dernière vue: {{ lastSeenFormatted }}
                                        </div>
                                    </div>
                                </v-col>

                                <v-col cols="12" md="8">
                                    <v-text-field
                                        label="Nom d'utilisateur"
                                        v-model="form.username"
                                        required
                                        prepend-icon="mdi-account"
                                        variant="outlined"
                                        :disabled="loading"
                                    ></v-text-field>

                                    <v-text-field
                                        label="Email"
                                        v-model="form.email"
                                        type="email"
                                        required
                                        prepend-icon="mdi-email"
                                        variant="outlined"
                                        :disabled="loading"
                                    ></v-text-field>

                                    <v-textarea
                                        label="Statut"
                                        v-model="form.status"
                                        rows="2"
                                        prepend-icon="mdi-text"
                                        variant="outlined"
                                        :disabled="loading"
                                    ></v-textarea>

                                    <v-text-field
                                        label="Nouveau mot de passe"
                                        v-model="form.password"
                                        type="password"
                                        prepend-icon="mdi-lock"
                                        variant="outlined"
                                        hint="Laissez vide pour conserver le mot de passe actuel"
                                        persistent-hint
                                        :disabled="loading"
                                    ></v-text-field>

                                    <v-row class="mt-4">
                                        <v-col class="d-flex justify-end gap-2" cols="12">
                                            <v-btn
                                                color="primary"
                                                type="submit"
                                                :loading="loading"
                                                prepend-icon="mdi-content-save"
                                            >
                                                Enregistrer
                                            </v-btn>
                                            <v-btn
                                                variant="text"
                                                @click="onCancel"
                                                :disabled="loading"
                                                prepend-icon="mdi-arrow-left"
                                            >
                                                Retour
                                            </v-btn>
                                        </v-col>
                                    </v-row>
                                </v-col>
                            </v-row>
                        </v-form>
                    </v-card-text>
                </v-card>

                <!-- Blocked users section -->
                <v-card class="mt-6">
                    <v-card-title>
                        <div class="d-flex align-center">
                            <v-icon class="me-2">mdi-account-cancel</v-icon>
                            Contacts bloqués
                        </div>
                    </v-card-title>
                    <v-card-text>
                        <v-list v-if="blockedUsers.length > 0">
                            <v-list-item
                                v-for="blockedUser in blockedUsers"
                                :key="blockedUser._id"
                            >
                                <template v-slot:prepend>
                                    <v-avatar color="grey">
                                        <span class="text-white">{{ blockedUser.username[0].toUpperCase() }}</span>
                                    </v-avatar>
                                </template>
                                <v-list-item-title>{{ blockedUser.username }}</v-list-item-title>
                                <v-list-item-subtitle>{{ blockedUser.email }}</v-list-item-subtitle>
                                <template v-slot:append>
                                    <v-btn
                                        icon="mdi-account-lock-open"
                                        size="small"
                                        color="primary"
                                        variant="text"
                                        @click="unblockUser(blockedUser._id)"
                                    >
                                    </v-btn>
                                </template>
                            </v-list-item>
                        </v-list>
                        <div v-else class="text-center text-grey py-4">
                            Aucun contact bloqué
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>

        <v-snackbar
            v-model="snackbar.show"
            :color="snackbar.color"
            :timeout="3000"
            top
        >
            {{ snackbar.message }}
        </v-snackbar>
    </v-container>
</template>

<script>
import {ref, reactive, onMounted, computed} from 'vue';
import {useRouter} from 'vue-router';
import {userAPI} from '../services/api.js';
import {useAuthStore} from '../store/index.js';
import { storeToRefs } from 'pinia';
import { formatDateTimeISO } from '../utils/date.js';

export default {
    name: 'ProfileView',
    setup() {
        const router = useRouter();
        const auth = useAuthStore();
        const { user } = storeToRefs(auth);
        const loading = ref(false);
        const original = ref(null);
        const preview = ref(null);
        const formRef = ref(null);
        const form = reactive({
            username: '',
            email: '',
            password: '',
            avatar: null,
            status: ''
        });
        const snackbar = reactive({
            show: false,
            message: '',
            color: 'success'
        });

        const initials = computed(() => {
            const name = form.username || user?.username || '';
            return name.split(' ').map(p => p[0] || '').slice(0, 2).join('').toUpperCase();
        });

        const load = async() => {
            loading.value = true;
            try {
                const res = await userAPI.getProfile();
                original.value = res.data;
                form.username = res.data.username;
                form.email = res.data.email;
                form.status = res.data.status || '';
                form.avatar = res.data.avatar || null;
            } catch (err) {
                console.error('Load profile error', err);
            } finally {
                loading.value = false;
            }
        };

        const onFileChange = async(event) => {
            const files = event.target?.files || event;
            const file = files?.[0] || (Array.isArray(event) ? event[0] : event);

            if (!file) return;

            if (!file.type?.startsWith('image/')) {
                snackbar.message = 'Veuillez sélectionner une image';
                snackbar.color = 'error';
                snackbar.show = true;
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                snackbar.message = 'L\'image ne doit pas dépasser 5 MB';
                snackbar.color = 'error';
                snackbar.show = true;
                return;
            }

            const reader = new FileReader();
            reader.onload = () => {
                preview.value = reader.result;
                snackbar.message = 'Image chargée avec succès';
                snackbar.color = 'success';
                snackbar.show = true;
            };
            reader.onerror = () => {
                snackbar.message = 'Erreur lors de la lecture du fichier';
                snackbar.color = 'error';
                snackbar.show = true;
            };
            reader.readAsDataURL(file);
        };

        const removeAvatar = () => {
            preview.value = null;
            form.avatar = null;
        };

        const onSubmit = async() => {
            try {
                loading.value = true;
                const payload = {
                    username: form.username,
                    email: form.email,
                    status: form.status
                };
                if (form.password) payload.password = form.password;
                if (preview.value) payload.avatar = preview.value;
                if (form.avatar === null && !preview.value) payload.avatar = null;

                const res = await userAPI.updateProfile(payload);
                auth.user = res.data;
                localStorage.setItem('user', JSON.stringify(res.data));

                snackbar.message = 'Profil mis à jour avec succès';
                snackbar.color = 'success';
                snackbar.show = true;

                form.password = '';
                form.avatar = res.data.avatar || null;
                preview.value = null;
            } catch (err) {
                console.error('Update profile error', err);
                snackbar.message = err.response?.data?.message || 'Erreur lors de la mise à jour';
                snackbar.color = 'error';
                snackbar.show = true;
            } finally {
                loading.value = false;
            }
        };

        const onCancel = () => {
            // Navigate back to main page without confirmation
            router.push('/');
        };

        const onDelete = async() => {
            if (!confirm('Voulez-vous vraiment supprimer votre compte ? Cette action est irréversible.')) return;
            try {
                loading.value = true;
                await userAPI.deleteProfile();
                snackbar.message = 'Compte supprimé avec succès';
                snackbar.color = 'success';
                snackbar.show = true;

                setTimeout(() => {
                    auth.logout();
                    window.location.href = '/register';
                }, 2000);
            } catch (err) {
                console.error('Delete profile error', err);
                snackbar.message = err.response?.data?.message || 'Erreur lors de la suppression';
                snackbar.color = 'error';
                snackbar.show = true;
                loading.value = false;
            }
        };

        const lastSeenFormatted = computed(() => {
            const ls = user.value?.lastSeen;
            if (!ls) return 'Jamais';
            return formatDateTimeISO(ls);
        });

        const blockedUsers = ref([]);

        const loadBlockedUsers = async () => {
            try {
                const res = await userAPI.getBlockedUsers();
                blockedUsers.value = res.data;
            } catch (err) {
                console.error('Load blocked users error', err);
            }
        };

        const unblockUser = async (userId) => {
            if (!confirm('Débloquer cet utilisateur ?')) return;

            try {
                await userAPI.toggleBlock(userId);
                await auth.loadUser();
                await loadBlockedUsers();
                snackbar.message = 'Utilisateur débloqué';
                snackbar.color = 'success';
                snackbar.show = true;
            } catch (err) {
                console.error('Unblock user error', err);
                snackbar.message = err.response?.data?.message || 'Erreur lors du déblocage';
                snackbar.color = 'error';
                snackbar.show = true;
            }
        };

        onMounted(async () => {
            await load();
            await loadBlockedUsers();
        });

        return {
            form,
            loading,
            onSubmit,
            onCancel,
            onDelete,
            preview,
            onFileChange,
            removeAvatar,
            initials,
            user,
            lastSeenFormatted,
            formRef,
            snackbar,
            blockedUsers,
            unblockUser
        };
    }
};
</script>

<style scoped>
.avatar-placeholder {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    font-weight: 700;
    font-size: 24px;
}

.avatar-placeholder-large {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    font-weight: 700;
    font-size: 48px;
}

.profile-avatar {
    border: 4px solid #f5f5f5;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.profile-avatar img {
    object-fit: cover;
    width: 100%;
    height: 100%;
}
</style>
