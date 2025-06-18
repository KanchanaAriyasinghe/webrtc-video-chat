const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static(path.join(__dirname, '../client')));

io.on('connection', socket => {
    socket.on('join', room => {
        socket.join(room);
        socket.to(room).emit('user-joined', socket.id);
    });

    socket.on('offer', ({ room, offer }) => {
        socket.to(room).emit('offer', { id: socket.id, offer });
    });

    socket.on('answer', ({ room, answer }) => {
        socket.to(room).emit('answer', { id: socket.id, answer });
    });

    socket.on('ice-candidate', ({ room, candidate }) => {
        socket.to(room).emit('ice-candidate', { id: socket.id, candidate });
    });

    socket.on('disconnect', () => {
        socket.broadcast.emit('user-left', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
