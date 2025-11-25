<template>
  <v-dialog v-model="model" max-width="800" persistent>
    <v-card>
      <v-toolbar density="compact" flat>
        <v-toolbar-title>{{ media?.originalFilename }}</v-toolbar-title>
        <v-spacer />
        <v-btn icon variant="text" @click="close">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>
      <v-card-text class="pa-2 preview-body">
        <div v-if="loading" class="d-flex align-center justify-center" style="min-height:300px;">
          <v-progress-circular indeterminate color="green" />
        </div>
        <template v-else>
          <img v-if="isImage" :src="objectUrl" :alt="media.originalFilename" class="preview-media" />
          <video v-else-if="isVideo" class="preview-media" :src="objectUrl" controls preload="metadata"></video>
          <div v-else class="d-flex flex-column align-center py-6">
            <v-icon size="64">mdi-file-document</v-icon>
            <p class="mt-2">Document: {{ media.originalFilename }}</p>
            <v-btn color="primary" @click="downloadDoc">Télécharger</v-btn>
          </div>
        </template>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch, computed, onBeforeUnmount } from 'vue';
import mediaAPI from '../services/mediaApi.js';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  media: { type: Object, default: null }
});
const emit = defineEmits(['update:modelValue']);

const model = ref(props.modelValue);
const loading = ref(false);
const objectUrl = ref(null);

watch(() => props.modelValue, v => { model.value = v; if (v) fetchMedia(); });
watch(model, v => emit('update:modelValue', v));
watch(() => props.media, () => { if (model.value) fetchMedia(); });

const isImage = computed(() => props.media && props.media.type === 'image');
const isVideo = computed(() => props.media && props.media.type === 'video');

async function fetchMedia() {
  if (!props.media) return;
  revoke();
  loading.value = true;
  try {
    const res = await mediaAPI.view(props.media._id);
    const blob = new Blob([res.data], { type: res.headers['content-type'] });
    objectUrl.value = URL.createObjectURL(blob);
  } catch (e) {
    console.error('Fetch media preview error', e);
  } finally {
    loading.value = false;
  }
}

function close() { model.value = false; }

function revoke() {
  if (objectUrl.value) {
    URL.revokeObjectURL(objectUrl.value);
    objectUrl.value = null;
  }
}

function downloadDoc() {
  if (!props.media) return;
  // Fallback vers téléchargement classique
  mediaAPI.download(props.media._id).then(res => {
    const blob = new Blob([res.data], { type: res.headers['content-type'] });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = props.media.originalFilename;
    a.click();
    URL.revokeObjectURL(url);
  });
}

onBeforeUnmount(revoke);
</script>

<style scoped>
.preview-media { max-width:100%; max-height:70vh; object-fit:contain; display:block; margin:0 auto; }
.preview-body { background:#000; }
</style>

