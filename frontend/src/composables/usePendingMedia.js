import { ref } from 'vue';
import { useUiStore } from '../store/uiStore.js';

// Composable pour gérer les fichiers médias sélectionnés avant upload
// files est un ref<Array<File>> pour conserver la réactivité même après destructuring

const filesRef = ref([]);
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

function classify(file) {
  const lower = file.name.toLowerCase();
  if (/\.(jpg|jpeg|png|webp|gif)$/i.test(lower)) return 'image';
  if (/\.(mp4|webm)$/i.test(lower)) return 'video';
  if (/\.pdf$/i.test(lower)) return 'doc';
  return 'other';
}

function isDuplicate(file) {
  return filesRef.value.some(f => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified);
}

function addFiles(list) {
  const ui = useUiStore();
  const arr = Array.from(list || []);
  for (const f of arr) {
    if (isDuplicate(f)) { ui.showNotification(`Fichier déjà sélectionné: ${f.name}`, 'info'); continue; }
    if (f.size > MAX_FILE_SIZE) { ui.showNotification(`Fichier trop volumineux (>20MB): ${f.name}`, 'error'); continue; }
    const type = classify(f);
    if (type === 'other') { ui.showNotification(`Type non supporté: ${f.name}`, 'warning'); continue; }
    f.__id = crypto.randomUUID();
    f.__type = type;
    if (type === 'image') {
      try {
        const reader = new FileReader();
        reader.onload = (ev) => { f.__preview = ev.target.result; };
        reader.readAsDataURL(f);
      } catch {}
    }
    filesRef.value.push(f);
  }
}

function removeFile(id) {
  const idx = filesRef.value.findIndex(f => f.__id === id);
  if (idx !== -1) filesRef.value.splice(idx, 1);
}

function clearFiles() {
  filesRef.value.length = 0;
}

export function usePendingMedia() {
  return {
    files: filesRef,
    addFiles,
    removeFile,
    clearFiles
  };
}
