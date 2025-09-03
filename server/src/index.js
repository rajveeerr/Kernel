import express from 'express';
import dotenv from 'dotenv';
import {Server} from 'socket.io';
import http from 'http';
import mongoose from 'mongoose'
import cors from 'cors';
import userRoutes from '../routes/user.js';

dotenv.config();
const mongoURL = process.env.MONGO_URL;
const port = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = new Server(server,{
     cors: { 
      origin: "*",
      methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

app.use('/api/users', userRoutes);

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

server.listen(port,async ()=>{
    try{
        await mongoose.connect(mongoURL)
        console.log('MongoDB connected');
        console.log(`Server running at port: ${port}`);
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
});