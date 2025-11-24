let ioInstance = null;

export const setIo = (io) => {
  ioInstance = io;
};

export const emitToConversation = (conversationId, event, data) => {
  if (!ioInstance) return;
  try {
    ioInstance.to(conversationId).emit(event, data);
  } catch (e) {
    console.error('Emit error:', e);
  }
};

export default { setIo, emitToConversation };

