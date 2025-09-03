import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import UsernameModal from '../components/UsernameModal';

const SOCKET_SERVER_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

const socket = io.connect(SOCKET_SERVER_URL);

const ChatRoom = () => {
  const { roomId } = useParams();
  const [username, setUsername] = useState('');
  const [showModal, setShowModal] = useState(true);
  
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const messageContainerRef = useRef(null);

  useEffect(() => {
    if (messageContainerRef.current) {
        messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages]);


  useEffect(() => {
    if (username) {
      socket.emit('join_room', roomId);
    }

    const messageListener = (data) => {
      setMessages((prevMessages) => [...prevMessages, data]);
    };
    socket.on('receive_message', messageListener);

    return () => {
      socket.off('receive_message', messageListener);
    };
  }, [roomId, username]);

  const handleUsernameSubmit = (name) => {
    setUsername(name);
    setShowModal(false);
  };

  const sendMessage = async () => {
    if (currentMessage.trim() !== '' && username) {
      const messageData = {
        roomId: roomId,
        sender: username,
        content: currentMessage,
      };
      
      await socket.emit('send_message', messageData);
      
      setMessages((prevMessages) => [...prevMessages, messageData]);
      setCurrentMessage('');
    }
  };

  if (showModal) {
    return <UsernameModal onSubmit={handleUsernameSubmit} />;
  }

  return (
    <div className="bg-gray-900 flex flex-col h-screen text-white">
      <header className="bg-gray-800 p-4 shadow-md flex justify-between items-center">
        <div>
            <h1 className="text-xl font-bold">kernel<span className="text-purple-400">[dot]</span>chat</h1>
            <p className="text-sm text-gray-400">Room ID: <span className="font-mono">{roomId}</span></p>
        </div>
        <div className="text-right">
            <p className="text-sm text-gray-300">Logged in as: <span className="font-bold text-purple-400">{username}</span></p>
        </div>
      </header>
      
      <main ref={messageContainerRef} className="flex-grow p-4 overflow-y-auto">
        {messages.map((msg, index) => (
          <div key={index} className={`mb-4 flex ${msg.sender === username ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs md:max-w-md`}>
              <p className={`text-xs mb-1 ${msg.sender === username ? 'text-right' : 'text-left'} text-gray-400`}>
                {msg.sender === username ? 'You' : msg.sender}
              </p>
              <div className={`px-4 py-2 rounded-lg ${msg.sender === username ? 'bg-purple-600' : 'bg-gray-700'}`}>
                <p className="break-words">{msg.content}</p>
              </div>
            </div>
          </div>
        ))}
      </main>

      <footer className="bg-gray-800 p-4">
        <div className="flex">
          <input
            type="text"
            value={currentMessage}
            placeholder="Type your message..."
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            className="flex-grow p-2 bg-gray-700 text-white rounded-l-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button onClick={sendMessage} className="bg-purple-600 text-white p-2 rounded-r-lg hover:bg-purple-700 transition-colors duration-200">
            Send
          </button>
        </div>
      </footer>
    </div>
  );
};

export default ChatRoom;