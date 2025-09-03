import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidV4 } from 'uuid';

const HomePage = () => {
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();

  const startNewChat = () => {
    const newRoomId = uuidV4();
    navigate(`/chat/${newRoomId}`);
  };

  const joinChat = (e) => {
    e.preventDefault();
    if (roomId) {
      navigate(`/chat/${roomId}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center text-white h-screen bg-black font-sans">
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
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          Start new private chat
        </button>
      </div>

      <p className="absolute bottom-5 text-xs text-gray-700">
        messages are end-to-end encrypted and never stored
      </p>
    </div>
  );
};

export default HomePage;