const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('client'));

io.on('connection', socket => {
  socket.on('join', room => {
    socket.join(room);
    socket.to(room).emit('ready');

    socket.on('offer', offer => socket.to(room).emit('offer', offer));
    socket.on('answer', answer => socket.to(room).emit('answer', answer));
    socket.on('candidate', candidate => socket.to(room).emit('candidate', candidate));
    socket.on('message', msg => socket.to(room).emit('message', msg));
  });
});

server.listen(3000, () => console.log('Server running on http://localhost:3000'));
