<template>
    <v-container class="py-6" fluid>
        <v-row justify="center">
            <v-col cols="12" md="10" lg="8">
                <v-card>
                    <v-card-title>
                        <div class="d-flex align-center w-100">
                            <v-avatar size="64" class="me-4">
                                <img v-if="preview || form.avatar" :src="preview || form.avatar" :alt="`${form.username || user?.username || 'Avatar'}`" />
                                <div v-else class="avatar-placeholder">{{ initials }}</div>
                            </v-avatar>

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
                                    <v-file-input
                                        accept="image/*"
                                        show-size
                                        truncate-length="15"
                                        placeholder="Choisir une photo"
                                        @change="onFileChange"
                                        prepend-icon="mdi-camera"
                                    />

                                    <v-btn text color="primary" v-if="(preview || form.avatar)" @click="removeAvatar">Supprimer la photo</v-btn>

                                    <div class="mt-4 text-center text-caption">Statut: <strong>{{ user?.isOnline ? 'En ligne' : 'Hors ligne' }}</strong></div>
                                    <div class="text-center text-caption">Dernière vue: <strong>{{ lastSeenFormatted }}</strong></div>
                                </v-col>

                                <v-col cols="12" md="8">
                                    <v-text-field label="Nom d'utilisateur" v-model="form.username" required></v-text-field>
                                    <v-text-field label="Email" v-model="form.email" type="email" required></v-text-field>
                                    <v-textarea label="Statut" v-model="form.status" rows="2"></v-textarea>
                                    <v-text-field label="Nouveau mot de passe" v-model="form.password" type="password" hint="Laissez vide pour conserver le mot de passe actuel"></v-text-field>

                                    <v-row class="mt-4">
                                        <v-col class="d-flex justify-end gap-2" cols="12" md="6">
                                            <v-btn color="primary" type="submit">Enregistrer</v-btn>
                                            <v-btn text @click="onCancel">Retour</v-btn>
                                        </v-col>
                                    </v-row>
                                </v-col>
                            </v-row>
                        </v-form>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
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

        const onFileChange = async(fileList) => {
            const file = Array.isArray(fileList) ? fileList[0] : fileList;
            if (!file) return;
            if (!file.type.startsWith('image/')) {
                alert('Veuillez sélectionner une image');
                return;
            }

            const reader = new FileReader();
            reader.onload = () => {
                preview.value = reader.result;
            };
            reader.readAsDataURL(file);
        };

        const removeAvatar = () => {
            preview.value = null;
            form.avatar = null;
        };

        const onSubmit = async() => {
            try {
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
                alert('Profil mis à jour');
                form.password = '';
                form.avatar = res.data.avatar || null;
                preview.value = null;
            } catch (err) {
                console.error('Update profile error', err);
                alert(err.response?.data?.message || 'Erreur lors de la mise à jour');
            }
        };

        const onCancel = () => {
            // Navigate back to main page without confirmation
            router.push('/');
        };

        const onDelete = async() => {
            if (!confirm('Voulez-vous vraiment supprimer votre compte ?')) return;
            try {
                await userAPI.deleteProfile();
                alert('Compte supprimé');
                auth.logout();
                window.location.href = '/register';
            } catch (err) {
                console.error('Delete profile error', err);
                alert(err.response?.data?.message || 'Erreur lors de la suppression');
            }
        };

        const lastSeenFormatted = computed(() => {
            const ls = user.value?.lastSeen;
            if (!ls) return 'Jamais';
            return formatDateTimeISO(ls);
        });

        onMounted(load);

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
            formRef
        };
    }
};
</script>

<style scoped>
.avatar-placeholder{
    width: 64px;
    height: 64px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #e0e0e0;
    color: #555;
    font-weight: 700
}
</style>
