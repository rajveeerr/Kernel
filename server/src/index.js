import express from 'express';
import dotenv from 'dotenv';
import {Server} from 'socket.io';
import http from 'http';

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server,{
     cors: { 
      origin: "*",
      methods: ["GET", "POST"]
    }
});

const port = process.env.PORT || 3000;

io.on('connection', (socket) => {
  console.log(`A user connected with connection id ${socket.id}`);

   socket.on('message',(data)=>{
    console.log(data);
    socket.emit('message',data);
    })

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });

  socket.on('chat message', (msg) => {
    io.emit('chat message', msg);
  });
});

server.listen(port,()=>{
    console.log(`Server running at port: ${port}`);
})  