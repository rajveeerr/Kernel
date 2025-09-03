import express from 'express';
import dotenv from 'dotenv';
import {Server} from 'socket.io';
import http from 'http';
import mongoose from 'mongoose'
import cors from 'cors';
import userRoutes from '../routes/user.js';
import Message from '../models/message.js';

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

const roomUsers={} //will be keeping is as {"roomId":[{username:"user1",id:"socketid"}]}
const activeCalls={}

io.on('connection', (socket) => {
  console.log(`A user connected with connection id ${socket.id}`);

  socket.on('join_room', async (data) => {
    const { roomId, username } = data;
    socket.join(roomId);
    socket.roomId=roomId;
    socket.username=username;

    if(!roomUsers[roomId]){
        roomUsers[roomId]=[]
    }
  roomUsers[roomId].push({username,id:socket.id});

  try{
    const oldMessages=await Message.find({roomId}).sort({createdAt:1}).limit(50);
    socket.emit('load_old_messages',oldMessages);
  }catch(err){
    console.error('Error loading old messages:', err);
    socket.emit('load_old_messages',[]);
  }

  io.in(roomId).emit('update_user_list', roomUsers[roomId] || []);

  if (activeCalls[roomId]) {
    socket.emit('call_in_progress');
  }

  });

  socket.on("call-user",(payload)=>{
    const {to,from,offer}=payload;
    io.to(to).emit("call-made",{offer,from});
  })

  socket.on("make-answer",(data)=>{
    const {to,answer}=data;
    activeCalls[socket.roomId] = true;
    io.in(socket.roomId).emit('call_in_progress');
    io.to(to).emit("answer-made",{answer});
  })

  socket.on("ice-candidate",(data)=>{
    const {to,candidate}=data;
    socket.to(to).emit("ice-candidate",{candidate});
  })

  socket.on('end-call', (data) => {
    const { roomId } = data;
    delete activeCalls[roomId];
    io.in(roomId).emit('call_ended');
  });

    socket.on('send_message', async (data) => {
        try{
            const message = new Message({
                roomId: data.roomId,
                sender: data.sender,
                content: data.content
            });
            await message.save();
            
            // Broadcast the message to other users in the room
            socket.to(data.roomId).emit('receive_message', {
                ...data,
                timestamp: message.createdAt
            });
        }
        catch(e){
            console.error('Error saving message:', e);
            socket.emit('message_error', { error: 'Failed to save message' });
        }
  });

  socket.on('disconnect', () => {
    const {roomId,id}=socket;

    if (roomUsers[roomId]) {
      roomUsers[roomId] = roomUsers[roomId].filter(user => user.id !== id);
      console.log(`User disconnected id ${socket.id}`);

      io.in(roomId).emit('update_user_list', roomUsers[roomId] || []);

       if (activeCalls[roomId]) {
        delete activeCalls[roomId];
        io.in(roomId).emit('call_ended');
      }

      if (roomUsers[roomId].length === 0) {
        delete roomUsers[roomId];
      }
    }
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