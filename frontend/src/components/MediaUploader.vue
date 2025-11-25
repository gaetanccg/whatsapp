<template>
  <div class="media-uploader">
    <div
      class="drop-zone"
      @dragover.prevent
      @drop.prevent="handleDrop"
      @click="triggerFileSelect"
    >
      <v-icon class="mr-2">mdi-paperclip</v-icon>
      <span>Ajouter des fichiers (glisser-déposer ou cliquer)</span>
      <input ref="fileInput" type="file" multiple class="d-none" :accept="accept" @change="handleSelect" />
    </div>
    <div v-if="files.length" class="previews">
      <div v-for="f in files" :key="f.__id" class="preview-item">
        <div class="thumb" v-if="f.__preview && f.__type === 'image'">
          <img :src="f.__preview" alt="preview" />
        </div>
        <div class="thumb placeholder" v-else>
          <v-icon v-if="f.__type==='video'">mdi-video</v-icon>
          <v-icon v-else-if="f.__type==='doc'">mdi-file-document</v-icon>
          <v-icon v-else>mdi-file</v-icon>
        </div>
        <div class="info">
          <span class="name">{{ f.name }}</span>
          <v-progress-linear v-if="progress[f.__id] !== undefined" :model-value="progress[f.__id]" height="6" rounded color="green" class="mt-1" />
          <div class="actions mt-1 d-flex">
            <v-btn size="x-small" variant="text" color="red" @click="removeFile(f.__id)">Retirer</v-btn>
            <v-btn size="x-small" variant="text" color="orange" v-if="uploading && progress[f.__id] < 100" @click="cancelUpload(f.__id)">Annuler</v-btn>
          </div>
        </div>
      </div>
      <div class="controls mt-2">
        <v-text-field v-model="messageText" placeholder="Message optionnel" density="compact" variant="outlined" hide-details />
        <v-btn color="green" class="ml-2" :disabled="!files.length || uploading" @click="startUpload">Envoyer</v-btn>
        <v-btn color="grey" class="ml-2" variant="outlined" :disabled="!files.length || uploading" @click="clearAll">Vider</v-btn>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useChatStore } from '../store/index.js';
import mediaAPI from '../services/mediaApi.js';

const chatStore = useChatStore();
const fileInput = ref(null);
const files = ref([]);
const progress = ref({});
const abortControllers = ref({});
const uploading = ref(false);
const messageText = ref('');

const accept = 'image/*,video/mp4,video/webm,application/pdf';

function triggerFileSelect() {
  fileInput.value && fileInput.value.click();
}

function classify(file) {
  const lower = file.name.toLowerCase();
  if (/(\.jpg|\.jpeg|\.png|\.webp|\.gif)$/.test(lower)) return 'image';
  if (/(\.mp4|\.webm)$/.test(lower)) return 'video';
  if (/\.pdf$/.test(lower)) return 'doc';
  return 'other';
}

function handleSelect(e) {
  const selected = Array.from(e.target.files || []);
  addFiles(selected);
  e.target.value = '';
}

function handleDrop(e) {
  const dropped = Array.from(e.dataTransfer.files || []);
  addFiles(dropped);
}

function addFiles(list) {
  for (const f of list) {
    const type = classify(f);
    if (type === 'other') continue; // ignore unsupported
    f.__id = crypto.randomUUID();
    f.__type = type;
    if (type === 'image') {
      const reader = new FileReader();
      reader.onload = (ev) => { f.__preview = ev.target.result; };
      reader.readAsDataURL(f);
    }
    files.value.push(f);
  }
}

function removeFile(id) {
  files.value = files.value.filter(f => f.__id !== id);
  delete progress.value[id];
  if (abortControllers.value[id]) {
    abortControllers.value[id].abort();
    delete abortControllers.value[id];
  }
}

function clearAll() {
  files.value = [];
  progress.value = {};
  abortControllers.value = {};
  messageText.value = '';
}

const startUpload = async () => {
  if (!chatStore.currentConversation || !files.value.length) return;
  uploading.value = true;
  try {
    // Un seul POST multipart -> un seul AbortController
    const controller = new AbortController();
    files.value.forEach(f => { progress.value[f.__id] = 0; abortControllers.value[f.__id] = controller; });
    let lastLoaded = 0;
    const res = await mediaAPI.upload(
      chatStore.currentConversation._id,
      files.value,
      messageText.value,
      {
        signal: controller.signal,
        onUploadProgress: (e) => {
          if (!e.total) return;
          const loaded = e.loaded;
          const delta = loaded - lastLoaded;
          lastLoaded = loaded;
          const remainingFiles = files.value.filter(f => progress.value[f.__id] < 100);
          const remainingBytes = remainingFiles.reduce((acc, f) => acc + (1 - progress.value[f.__id]/100) * f.size, 0);
          for (const f of remainingFiles) {
            const fileRemaining = (1 - progress.value[f.__id]/100) * f.size;
            if (remainingBytes > 0) {
              const inc = (delta * (fileRemaining / remainingBytes)) / f.size * 100;
              progress.value[f.__id] = Math.min(100, progress.value[f.__id] + inc);
            }
          }
        }
      }
    );
    chatStore.addMessage(res.data);
    clearAll();
  } catch (err) {
    if (err.name === 'CanceledError' || err.message === 'canceled') {
      // Annulation
    } else {
      console.error('Upload media error:', err.response?.data || err.message);
    }
  } finally {
    uploading.value = false;
  }
};

const cancelUpload = (id) => {
  const ctrl = abortControllers.value[id];
  if (ctrl) ctrl.abort();
  uploading.value = false;
};
</script>

<style scoped>
.media-uploader { padding: 8px; }
.drop-zone {
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  color: #555;
  transition: background .2s;
}
.drop-zone:hover { background: #f7f7f7; }
.previews { margin-top: 10px; }
.preview-item { display: flex; align-items: center; margin-bottom: 8px; background:#fff; border:1px solid #eee; border-radius:6px; padding:6px; }
.thumb { width:60px; height:60px; display:flex; align-items:center; justify-content:center; overflow:hidden; border-radius:4px; background:#fafafa; }
.thumb img { width:100%; height:100%; object-fit:cover; }
.info { flex:1; margin-left:10px; font-size:12px; }
.name { font-weight:600; display:block; }
.placeholder { font-size:24px; color:#888; }
.controls { display:flex; align-items:center; }
</style>
