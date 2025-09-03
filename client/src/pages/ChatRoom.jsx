import React from 'react';
import { useParams } from 'react-router-dom';

const ChatRoom = () => {
    const { roomId } = useParams();

    return (
        <div className="text-white">
            <h1 className="text-2xl">Chat Room</h1>
            <p className="text-purple-400">Your Room ID is: {roomId}</p>
        </div>
    );
};

export default ChatRoom;