import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import Media from '../models/Media.js';
import path from 'path';
import fs from 'fs';
import { processMediaFiles } from '../utils/mediaProcessing.js';
import { emitToConversation } from '../sockets/socketEmitter.js';

export const uploadMedia = async (req, res) => {
  try {
    const { conversationId, content } = req.body;
    if (!conversationId) {
      return res.status(400).json({ message: 'conversationId requis' });
    }
    const conversation = await Conversation.findOne({ _id: conversationId, participants: req.user._id });
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation introuvable' });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Aucun fichier fourni' });
    }

    // Créer message placeholder (content optionnel)
    const message = await Message.create({
      conversation: conversationId,
      sender: req.user._id,
      content: content || '',
      readBy: [req.user._id]
    });

    // Traiter médias
    const processed = await processMediaFiles(req.files, conversationId);

    const mediaDocs = [];
    for (const item of processed) {
      const { file, type, width, height, durationSeconds, thumbnailFilename, thumbnailWidth, thumbnailHeight, compressionApplied } = item;
      const doc = await Media.create({
        user: req.user._id,
        conversation: conversationId,
        message: message._id,
        type,
        originalFilename: file.originalname,
        storedFilename: path.basename(file.path),
        sizeBytes: file.size,
        mimeType: file.mimetype,
        width,
        height,
        durationSeconds,
        thumbnailFilename,
        thumbnailWidth,
        thumbnailHeight,
        compressionApplied
      });
      mediaDocs.push(doc);
      message.media.push(doc._id);
    }

    // Déterminer messageType
    if (mediaDocs.length > 0) {
      const firstType = mediaDocs[0].type;
      message.messageType = firstType === 'doc' ? 'file' : firstType;
    } else if (!content) {
      message.messageType = 'file';
    }
    await message.save();

    await message.populate([
      { path: 'sender', select: '-password' },
      { path: 'media' }
    ]);

    conversation.lastMessage = message._id;
    conversation.participants.forEach(participantId => {
      if (participantId.toString() !== req.user._id.toString()) {
        const currentCount = conversation.unreadCount.get(participantId.toString()) || 0;
        conversation.unreadCount.set(participantId.toString(), currentCount + 1);
      }
    });
    await conversation.save();

    // Emit message to room
    emitToConversation(conversationId, 'receiveMessage', message);

    // Emit notification to other participants
    conversation.participants.forEach(pid => {
      if (pid.toString() !== req.user._id.toString()) {
        emitToConversation(pid.toString(), 'newMessageNotification', {
          conversationId: conversationId,
          message,
          unreadCount: conversation.unreadCount.get(pid.toString()) || 0
        });
      }
    });

    res.status(201).json(message);
  } catch (err) {
    console.error('Upload media error:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

export const downloadMedia = async (req, res) => {
  try {
    const { id } = req.params;
    const media = await Media.findById(id).populate('conversation');
    if (!media || media.deletedAt) {
      return res.status(404).json({ message: 'Media introuvable' });
    }
    if (!media.conversation.participants.map(p => p.toString()).includes(req.user._id.toString())) {
      return res.status(403).json({ message: 'Accès interdit' });
    }
    const filePath = path.join(process.cwd(), 'backend', 'uploads', 'original', media.conversation._id.toString(), media.storedFilename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Fichier non trouvé' });
    }
    res.setHeader('Content-Type', media.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${media.originalFilename}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error('Download media error:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

export const deleteMedia = async (req, res) => {
  try {
    const { id } = req.params;
    const media = await Media.findById(id);
    if (!media || media.deletedAt) {
      return res.status(404).json({ message: 'Media introuvable ou déjà supprimé' });
    }
    if (media.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Vous ne pouvez pas supprimer ce média' });
    }
    media.deletedAt = new Date();
    await media.save();

    // Retirer référence du message
    await Message.findByIdAndUpdate(media.message, { $pull: { media: media._id } });

    res.json({ message: 'Media supprimé (soft delete)' });
  } catch (err) {
    console.error('Delete media error:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

export const getThumbnail = async (req, res) => {
  try {
    const { id } = req.params;
    const media = await Media.findById(id).populate('conversation');
    if (!media || media.deletedAt || !media.thumbnailFilename) {
      return res.status(404).json({ message: 'Miniature indisponible' });
    }
    if (!media.conversation.participants.map(p => p.toString()).includes(req.user._id.toString())) {
      return res.status(403).json({ message: 'Accès interdit' });
    }
    const thumbPath = path.join(process.cwd(), 'backend', 'uploads', 'thumbs', media.conversation._id.toString(), media.thumbnailFilename);
    if (!fs.existsSync(thumbPath)) {
      return res.status(404).json({ message: 'Fichier miniature introuvable' });
    }
    res.setHeader('Content-Type', 'image/jpeg');
    fs.createReadStream(thumbPath).pipe(res);
  } catch (err) {
    console.error('Get thumbnail error:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

export const streamMedia = async (req, res) => {
  try {
    const { id } = req.params;
    const media = await Media.findById(id).populate('conversation');
    if (!media || media.deletedAt) {
      return res.status(404).json({ message: 'Media introuvable' });
    }
    if (!media.conversation.participants.map(p => p.toString()).includes(req.user._id.toString())) {
      return res.status(403).json({ message: 'Accès interdit' });
    }
    const filePath = path.join(process.cwd(), 'backend', 'uploads', 'original', media.conversation._id.toString(), media.storedFilename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Fichier non trouvé' });
    }
    res.setHeader('Content-Type', media.mimeType);
    // Ne pas mettre Content-Disposition pour image/vidéo afin de permettre l'affichage inline
    if (media.type === 'doc') {
      res.setHeader('Content-Disposition', `attachment; filename="${media.originalFilename}"`);
    }
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error('Stream media error:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// Nouvelle fonction : lister les médias d'une conversation
export const listConversationMedia = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const limit = parseInt(req.query.limit || '100');
    const skip = parseInt(req.query.skip || '0');

    const conversation = await Conversation.findOne({ _id: conversationId, participants: req.user._id });
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const medias = await Media.find({ conversation: conversationId, deletedAt: null })
      .populate('user', '-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json(medias);
  } catch (err) {
    console.error('List conversation media error:', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};
