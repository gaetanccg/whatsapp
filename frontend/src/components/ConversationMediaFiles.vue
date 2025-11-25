<template>
    <v-dialog v-model="localShow" max-width="920">
        <v-card>
            <v-card-title>
                <div class="d-flex align-center">
                    <v-icon class="me-2">mdi-image-multiple</v-icon>
                    Médias et fichiers
                </div>
                <v-spacer />
                <v-btn icon variant="text" @click="close">
                    <v-icon>mdi-close</v-icon>
                </v-btn>
            </v-card-title>

            <v-card-text>
                <div v-if="loading" class="text-center py-6">
                    <v-progress-circular indeterminate color="green"></v-progress-circular>
                </div>

                <div v-else>
                    <div v-if="items.length === 0" class="text-center text-grey py-6">Aucun média ou fichier</div>

                    <div class="all-grid">
                        <div v-for="m in items" :key="m._id" class="all-item">
                            <div v-if="m.type === 'image' || m.type === 'video'" class="media-thumb" @click="openMedia(m)">
                                <template v-if="getThumbUrl(m)">
                                    <img :src="getThumbUrl(m)" :alt="m.originalFilename" />
                                </template>
                                <template v-else>
                                    <div class="thumb-placeholder">
                                        <v-progress-circular indeterminate color="green" size="28" />
                                    </div>
                                </template>
                                <v-icon v-if="m.type === 'video'" class="play">mdi-play-circle-outline</v-icon>
                                <div class="media-overlay">
                                    <div class="title">{{ m.originalFilename }}</div>
                                    <div class="meta">{{ m.user?.username }} • {{ formatSize(m.sizeBytes) }}</div>
                                </div>
                            </div>
                            <div v-else class="file-thumb">
                                <v-icon large>mdi-file-document-outline</v-icon>
                                <div class="file-name">{{ m.originalFilename }}</div>
                                <div class="file-meta">{{ formatSize(m.sizeBytes) }} • {{ m.user?.username }}</div>
                                <div class="file-actions">
                                    <v-btn icon small @click.stop="download(m)">
                                        <v-icon>mdi-download</v-icon>
                                    </v-btn>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </v-card-text>
        </v-card>

        <media-preview-modal v-model="preview.show" :media="preview.media" />
    </v-dialog>
</template>

<script setup>
import {ref, watch, onBeforeUnmount} from 'vue';
import {mediaAPI} from '../services/api.js';
import MediaPreviewModal from './MediaPreviewModal.vue';

const props = defineProps({
    conversationId: {
        type: String,
        required: true
    },
    show: {
        type: Boolean,
        default: false
    }
});
const emit = defineEmits(['update:show']);

const localShow = ref(!!props.show);
const loading = ref(false);
const items = ref([]);
const preview = ref({
    show: false,
    media: null
});

// cache des miniatures/object URLs pour s'assurer que les requêtes passent avec Authorization
const thumbMap = ref({}); // { [mediaId]: objectUrl }
const thumbLoading = ref({}); // { [mediaId]: boolean }

// watch items et fetch des miniatures
watch(() => props.show, (v) => {
    localShow.value = !!v;
});

watch(localShow, (v) => {
    emit('update:show', v);
    if (v && props.conversationId) fetchMedia();
});

watch(() => props.conversationId, (v) => {
    if (v && localShow.value) fetchMedia();
});

async function fetchMedia() {
    loading.value = true;
    try {
        const res = await mediaAPI.getConversationMedia(props.conversationId, {limit: 500});
        items.value = res.data || [];
        // démarrer le fetch des miniatures en arrière-plan
        for (const m of items.value) {
            fetchThumb(m).catch(() => {
            });
        }
    } catch (err) {
        console.error('Load conversation media error', err);
        items.value = [];
    } finally {
        loading.value = false;
    }
}

// Récupère la miniature via l'API (axios) pour inclure Authorization, puis créer un object URL.
async function fetchThumb(m) {
    if (!m || !m._id) return;
    if (thumbMap.value[m._id] || thumbLoading.value[m._id]) return;
    thumbLoading.value[m._id] = true;
    try {
        // essayer la miniature d'abord
        try {
            const res = await mediaAPI.thumbnail(m._id);
            const blob = new Blob([res.data], {type: res.headers['content-type'] || 'image/jpeg'});
            const url = URL.createObjectURL(blob);
            thumbMap.value[m._id] = url;
            return url;
        } catch (e) {
            // si thumbnail non dispo, pour les images essayer le flux raw
            if (m.type === 'image') {
                const res2 = await mediaAPI.view(m._id);
                const blob2 = new Blob([res2.data], {type: res2.headers['content-type'] || 'image/*'});
                const url2 = URL.createObjectURL(blob2);
                thumbMap.value[m._id] = url2;
                return url2;
            }
            // pour video ou doc, on ne crée pas de thumbnail
        }
    } catch (err) {
        // ignore
    } finally {
        thumbLoading.value[m._id] = false;
    }
}

function getThumbUrl(m) {
    return thumbMap.value[m._id] || null;
}

function openMedia(m) {
    preview.value.media = m;
    preview.value.show = true;
}

function formatSize(bytes) {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return Math.round(bytes / (1024 * 1024)) + ' MB';
}

function download(m) {
    window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/media/${m._id}`, '_blank');
}

function close() {
    localShow.value = false;
    // Revoke object URLs on close to free memory
    Object.values(thumbMap.value || {}).forEach(url => {
        try { URL.revokeObjectURL(url); } catch (e) {}
    });
}

// Revoke object URLs on unmount
onBeforeUnmount(() => {
    Object.values(thumbMap.value || {}).forEach(url => {
        try { URL.revokeObjectURL(url); } catch (e) {}
    });
});
</script>

<style scoped>
/* larger, more airy layout for readability */
.all-grid{
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 14px;
    align-items: start;
}

.all-item{
    display: flex;
    flex-direction: column;
    align-items: stretch;
}

.media-thumb{
    width: 100%;
    height: 140px;
    overflow: hidden;
    border-radius: 10px;
    background: #f6f6f6;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    position: relative;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);
}

.media-thumb img{
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.media-thumb:hover{
    transform: translateY(-4px);
    transition: transform 160ms ease-in-out;
}

.media-overlay{
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.55) 100%);
    color: #fff;
    padding: 8px 10px;
    font-size: 13px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.media-overlay .title{
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 78%;
}

.media-overlay .meta{
    font-size: 11px;
    opacity: 0.9;
}

.file-thumb{
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px;
    border-radius: 10px;
    background: #fff;
    text-align: center;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.04);
    min-height: 140px;
    justify-content: center
}

.file-name{
    font-size: 13px;
    font-weight: 600;
    margin-top: 8px;
    max-width: 140px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis
}

.file-meta{
    font-size: 12px;
    color: #666;
    margin-top: 6px
}

.file-actions{
    margin-top: 10px
}

.thumb-placeholder{
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f6f6f6;
    border-radius: 10px;
    box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>
