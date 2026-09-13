import { Server } from 'socket.io';

// Wires up Socket.io on top of the existing HTTP server. Message events
// (receive-message, message-updated) are emitted from messageController.js
// via `req.app.get('io')`; this file only owns room membership + the
// live-cursor relay that the board UI already expects.
export function initSocket(httpServer, allowedOrigins) {
  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins.length ? allowedOrigins : true,
    },
  });

  io.on('connection', (socket) => {
    socket.on('join-room', (roomId) => {
      if (roomId) socket.join(roomId);
    });

    socket.on('leave-room', (roomId) => {
      if (roomId) socket.leave(roomId);
    });

    socket.on('cursor-move', (data) => {
      if (data?.roomId) {
        socket.to(data.roomId).emit('cursor-move', data);
      }
    });
  });

  return io;
}