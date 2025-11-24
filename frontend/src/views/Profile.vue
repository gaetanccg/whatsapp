<template>
  <div class="profile container">
    <h2>Mon profil</h2>

    <div v-if="loading">Chargement...</div>

    <form v-else @submit.prevent="onSubmit">
      <div class="profile-row">
        <div class="avatar-block">
          <img v-if="preview || form.avatar" :src="preview || form.avatar" class="avatar" :alt="`${form.username || user?.username || 'Avatar'}`" />
          <div v-else class="avatar placeholder">{{ initials }}</div>

          <input type="file" accept="image/*" @change="onFileChange" />
          <button type="button" v-if="(preview || form.avatar)" @click="removeAvatar">Supprimer la photo</button>
        </div>

        <div class="fields">
          <div>
            <label>Nom d'utilisateur</label>
            <input v-model="form.username" required minlength="3" />
          </div>

          <div>
            <label>Email</label>
            <input v-model="form.email" type="email" required />
          </div>

          <div>
            <label>Statut</label>
            <input v-model="form.status" maxlength="160" />
          </div>

          <div>
            <label>Nouveau mot de passe (laisser vide pour ne pas changer)</label>
            <input v-model="form.password" type="password" minlength="6" />
          </div>

          <div class="meta">
            <div>Statut en ligne: <strong>{{ user?.isOnline ? 'En ligne' : 'Hors ligne' }}</strong></div>
            <div>Dernière vue: <strong>{{ lastSeenFormatted }}</strong></div>
          </div>

          <div class="actions">
            <button type="submit">Enregistrer</button>
            <button type="button" @click="onCancel">Annuler</button>
          </div>
        </div>
      </div>
    </form>

    <hr />

    <div>
      <h3>Supprimer le compte</h3>
      <p>Cette action est irréversible.</p>
      <button @click="onDelete" class="danger">Supprimer mon profil</button>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, computed } from 'vue';
import { userAPI } from '../services/api.js';
import { useAuthStore } from '../store/index.js';

export default {
  name: 'ProfileView',
  setup() {
    const auth = useAuthStore();
    const user = auth.user;
    const loading = ref(false);
    const original = ref(null);
    const preview = ref(null);
    const form = reactive({ username: '', email: '', password: '', avatar: null, status: '' });

    const initials = computed(() => {
      const name = form.username || user?.username || '';
      return name.split(' ').map(p => p[0] || '').slice(0,2).join('').toUpperCase();
    });

    const load = async () => {
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

    const onFileChange = async (e) => {
      const file = e.target.files[0];
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

    const onSubmit = async () => {
      try {
        const payload = { username: form.username, email: form.email, status: form.status };
        if (form.password) payload.password = form.password;
        // If user selected a new avatar preview, send it (base64)
        if (preview.value) payload.avatar = preview.value;
        // If avatar removed explicitly, send null
        if (form.avatar === null && !preview.value) payload.avatar = null;

        const res = await userAPI.updateProfile(payload);
        // Update auth store and localStorage
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
      if (original.value) {
        form.username = original.value.username;
        form.email = original.value.email;
        form.status = original.value.status || '';
        form.password = '';
        form.avatar = original.value.avatar || null;
        preview.value = null;
      }
    };

    const onDelete = async () => {
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
      const ls = user?.lastSeen;
      if (!ls) return 'Jamais';
      const d = new Date(ls);
      return d.toLocaleString();
    });

    onMounted(load);

    return { form, loading, onSubmit, onCancel, onDelete, preview, onFileChange, removeAvatar, initials, user, lastSeenFormatted };
  }
};
</script>

<style scoped>
.container { max-width: 800px; margin: 2rem auto; }
.danger { background: #e53e3e; color: white; }
.profile-row { display: flex; gap: 1rem; }
.avatar-block { width: 200px; }
.avatar { width: 150px; height: 150px; object-fit: cover; border-radius: 50%; }
.avatar.placeholder { width: 150px; height: 150px; display:flex;align-items:center;justify-content:center;border-radius:50%;background:#ddd;font-size:48px;color:#666 }
.fields { flex: 1; }
.meta { margin-top: 0.5rem; color: #666 }
.actions { margin-top: 1rem }
</style>
