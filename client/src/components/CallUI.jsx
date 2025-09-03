import React from 'react';
import { FiMic, FiMicOff, FiPhoneOff } from 'react-icons/fi';

const UserCallCard = ({ username, isMuted }) => (
  <div className="relative w-full h-full bg-gray-900/50 border border-gray-700 rounded-2xl flex flex-col items-center justify-center p-4 transition-all duration-300">
    <div className="w-32 h-32 bg-gray-800 rounded-full flex items-center justify-center mb-4 ring-4 ring-gray-700">
      <span className="text-6xl font-bold text-gray-500">
        {username ? username.charAt(0).toUpperCase() : '?'}
      </span>
    </div>
    <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full">
      <p className="text-white font-semibold">{username}</p>
    </div>
    {isMuted && (
      <div className="absolute top-4 right-4 bg-red-600 p-2 rounded-full text-white">
        <FiMicOff className="w-5 h-5" />
      </div>
    )}
  </div>
);

const CallUI = ({ isVisible = true, localUsername, remoteUsername, isMuted, onToggleMute, onEndCall }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black flex flex-col p-4 md:p-8 z-40 font-sans">
      <div className="flex-grow flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
        <UserCallCard username={remoteUsername} />
        <UserCallCard username={`${localUsername} (You)`} isMuted={isMuted} />
      </div>

      <div className="flex justify-center items-center mt-4">
        <div className="flex space-x-4 p-3 bg-gray-900/80 border border-gray-700 backdrop-blur-sm rounded-full">
          <button
            onClick={onToggleMute}
            className={`w-16 h-16 flex items-center justify-center rounded-full transition-colors duration-200 text-white ${isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-800 hover:bg-gray-700'}`}
          >
            {isMuted ? <FiMicOff className="w-6 h-6" /> : <FiMic className="w-6 h-6" />}
          </button>
          
          <button 
            onClick={onEndCall}
            className="bg-red-600 hover:bg-red-700 text-white w-24 h-16 flex items-center justify-center rounded-full transition-colors duration-200"
          >
            <FiPhoneOff className="w-7 h-7" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallUI;