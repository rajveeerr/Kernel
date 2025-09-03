import React from 'react';

const CallUI = ({ onEndCall }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50 text-white">
      <h2 className="text-3xl font-bold mb-4 animate-pulse">Call in Progress...</h2>
      <div className="mt-8">
        <button
          onClick={onEndCall}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-full transition-colors duration-200"
        >
          End Call
        </button>
      </div>
    </div>
  );
};

export default CallUI;