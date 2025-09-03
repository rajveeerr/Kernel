import React, { useState } from 'react';

const UsernameModal = ({ onSubmit }) => {
  const [username, setUsername] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim()) {
      onSubmit(username.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 font-sans">
      <form onSubmit={handleSubmit} className="w-full max-w-sm px-4 text-center">
        <h2 className="text-white text-3xl font-bold mb-6">What should we call you?</h2>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter a username..."
          className="w-full px-4 py-3 mb-6 text-center bg-gray-900 text-white border border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-lg"
          autoFocus
        />
        <button
          type="submit"
          disabled={!username.trim()}
          className="w-full px-4 py-3 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Join Chat Room
        </button>
      </form>
    </div>
  );
};

export default UsernameModal;