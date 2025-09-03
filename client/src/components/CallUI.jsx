import React from 'react';
import { FiMicOff, FiPhoneOff } from 'react-icons/fi';

const CallUI = ({ callerUsername, onEndCall }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col justify-between items-center z-40 p-8 font-sans">
      <div className="text-center">
        <p className="text-gray-400">In call with</p>
        <h2 className="text-3xl font-bold">{callerUsername || "User"}</h2>
      </div>

      <div className="flex-grow flex items-center justify-center">
        <div className="w-40 h-40 bg-gray-800 rounded-full flex items-center justify-center">
          <span className="text-5xl font-bold text-gray-500">
            {callerUsername ? callerUsername.charAt(0).toUpperCase() : 'U'}
          </span>
        </div>
      </div>

      <div className="flex space-x-4">
        <button className="bg-gray-700/80 hover:bg-gray-600 text-white w-16 h-16 flex items-center justify-center rounded-full transition-colors duration-200">
          <FiMicOff className="w-6 h-6" />
        </button>
        <button 
          onClick={onEndCall}
          className="bg-red-600 hover:bg-red-700 text-white w-20 h-16 flex items-center justify-center rounded-full transition-colors duration-200"
        >
          <FiPhoneOff className="w-6 h-6 text-white" />
        </button>
      </div>
    </div>
  );
};

export default CallUI;