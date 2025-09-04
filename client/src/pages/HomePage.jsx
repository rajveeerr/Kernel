import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidV4 } from 'uuid';
import { FiLock } from 'react-icons/fi';
import io from 'socket.io-client';

const SOCKET_SERVER_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const HomePage = () => {
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();

  const startNewChat = () => {
    const newRoomId = uuidV4();
    navigate(`/chat/${newRoomId}`);
  };

  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    let mounted = true;
    const socket = io.connect(SOCKET_SERVER_URL);

    socket.emit('get_rooms');
    socket.on('rooms_list', (data) => {
      if (!mounted) return;
      setRooms(Array.isArray(data) ? data : []);
    });

    return () => {
      mounted = false;
      socket.disconnect();
    };
  }, []);

  const joinChat = (e) => {
    e.preventDefault();
    if (roomId) {
      navigate(`/chat/${roomId}`);
    }
  };

  return (
    <div className="relative min-h-screen w-full font-sans">
      <div
        className="flex flex-col items-center justify-center text-white min-h-screen w-full"
        style={{
          backgroundImage: "linear-gradient(rgba(0,0,0,0.80), rgba(0,0,0,0.9)), url('/gradient.jpg')",
          // backgroundSize: 'cover',
          // backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center'
        }}
      >
        <div className="text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-2">
          kernel<span className="font-mono text-purple-400">[chat]</span>
        </h1>
        <p className="text-gray-400 mb-16">
          one-time end-to-end encrypted anonymous chats
        </p>
      </div>

      <div className="w-full max-w-sm px-4">
        <form onSubmit={joinChat} className="flex flex-col items-center">
          <p className="text-gray-300 mb-4">Join private chat</p>
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Enter chat code or link to join..."
            className="w-full px-4 py-3 mb-6 text-center bg-gray-900 border border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
          />
          <p className="text-gray-500 mb-6">or</p>
        </form>
        <button
          onClick={startNewChat}
          className="w-full px-4 py-3 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center shadow-lg"
        >
          <FiLock className="w-5 h-5 mr-2 text-black" />
          Start new private chat
        </button>
      
        <div className="mt-8 bg-gray-900/40 border border-gray-800 rounded-xl p-4">
          <h3 className="text-sm text-gray-300 mb-3 font-semibold">Available rooms</h3>
          {rooms.length === 0 ? (
            <div className="text-gray-500 text-sm">No public rooms found. Create one or join with a code.</div>
          ) : (
            <div className="space-y-3">
              {rooms.map((r) => (
                <div key={r.id} className="flex items-center justify-between bg-black/30 border border-gray-800 rounded-lg p-3">
                  <div>
                    <div className="text-sm text-gray-100 font-medium">{r.name || r.id}</div>
                    <div className="text-xs text-gray-400">{(r.users || 0)} online</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => navigate(`/chat/${r.id}`)} className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-full text-sm">Join</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="absolute bottom-5 text-xs text-gray-700">
        messages are end-to-end encrypted and never stored
      </p>
    </div>
  </div>
  );
};

export default HomePage;