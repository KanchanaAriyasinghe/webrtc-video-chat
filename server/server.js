const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Serve static client files
app.use(express.static(path.join(__dirname, '../client')));

io.on('connection', socket => {
  socket.on('join', room => socket.join(room));
  socket.on('chat-message', ({ room, msg }) => socket.to(room).emit('chat-message', { msg }));
  socket.on('offer', data => socket.to(data.room).emit('offer', data));
  socket.on('answer', data => socket.to(data.room).emit('answer', data));
  socket.on('ice-candidate', data => socket.to(data.room).emit('ice-candidate', data));
  socket.on('disconnecting', () => {
    const rooms = socket.rooms;
    rooms.forEach(room => socket.to(room).emit('user-left'));
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
