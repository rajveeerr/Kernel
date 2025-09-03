import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import toast from 'react-hot-toast';
import UsernameModal from '../components/UsernameModal';
import { FiUsers, FiPhone } from 'react-icons/fi';
import CallUI from '../components/callUI';


const SOCKET_SERVER_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
const socket = io.connect(SOCKET_SERVER_URL);


const ChatRoom = () => {
  const { roomId } = useParams();

  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isUserListVisible, setIsUserListVisible] = useState(false);
  
  const [username, setUsername] = useState('');
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);

  const [isInCall, setIsInCall] = useState(false);
  const [isReceivingCall, setIsReceivingCall] = useState(false);
  const [callerInfo, setCallerInfo] = useState(null);

  const peerConnectionRef = useRef(null); 
  const localStreamRef = useRef(null); 
  const remoteStreamRef = useRef(null); 
  const messageContainerRef = useRef(null);


  useEffect(() => {
    const toastId = toast.loading('Connecting to chat...');
    setTimeout(() => {
      toast.success('Connected!', { id: toastId });
      setIsLoading(false);
      setShowModal(true);
    }, 2000);
  }, []);

  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!username) return;

    socket.emit('join_room', { roomId, username });

    const messageListener = (data) => {
      setMessages((prev) => [...prev, data]);
    };

    const userListListener = (users) => {
      setOnlineUsers(users);
    };

    const callMadeListener = async (data) => {
      const { offer, from } = data;
      setCallerInfo(from);

      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      peerConnectionRef.current = pc;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', { to: from.id, candidate: event.candidate });
        }
      };

      pc.ontrack = (event) => {
        if (remoteStreamRef.current) {
          remoteStreamRef.current.srcObject = event.streams[0];
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      setIsReceivingCall(true);
    };

    const answerMadeListener = async (data) => {
      if(peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    };

    const iceCandidateListener = (data) => {
      if(peerConnectionRef.current) {
        peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    };

    socket.on('receive_message', messageListener);
    socket.on('update_user_list', userListListener);
    socket.on('call-made', callMadeListener);
    socket.on('answer-made', answerMadeListener);
    socket.on('ice-candidate', iceCandidateListener);

    return () => {
      socket.off('receive_message', messageListener);
      socket.off('update_user_list', userListListener);
      socket.off('call-made', callMadeListener);
      socket.off('answer-made', answerMadeListener);
      socket.off('ice-candidate', iceCandidateListener);
    };
  }, [roomId, username]);


  const handleUsernameSubmit = (name) => {
    setUsername(name);
    setShowModal(false);
  };

  const sendMessage = async () => {
    if (currentMessage.trim() !== '' && username) {
      const messageData = { roomId, sender: username, content: currentMessage };
      await socket.emit('send_message', messageData);
      setMessages((prevMessages) => [...prevMessages, messageData]);
      setCurrentMessage('');
    }
  };

  const startCall = async (targetUser) => {
    try {
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      peerConnectionRef.current = pc;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', { to: targetUser.id, candidate: event.candidate });
        }
      };
      
      pc.ontrack = (event) => {
        if (remoteStreamRef.current) {
          remoteStreamRef.current.srcObject = event.streams[0];
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      const currentUser = onlineUsers.find(u => u.id === socket.id);
      socket.emit('call-user', { to: targetUser.id, from: currentUser, offer });
      setIsInCall(true);
    } catch (error) {
      console.error("Error starting call:", error);
      toast.error("Could not start call. Check microphone permissions.");
    }
  };
  
  const answerCall = async () => {
    socket.emit('make-answer', {
        to: callerInfo.id,
        answer: peerConnectionRef.current.localDescription
    });
    setIsReceivingCall(false);
    setIsInCall(true);
  };
  
  const endCall = useCallback(() => {
    if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
    }
    setIsInCall(false);
    setIsReceivingCall(false);
    setCallerInfo(null);
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center text-white h-screen bg-black">
        <h1 className="text-2xl text-gray-400 animate-pulse">Connecting...</h1>
      </div>
    );
  }

  if (showModal) {
    return <UsernameModal onSubmit={handleUsernameSubmit} />;
  }

  return (
    <div className="bg-black flex flex-col h-screen text-white font-sans">
      <audio ref={remoteStreamRef} autoPlay playsInline />
      
      {isInCall && <CallUI onEndCall={endCall} callerUsername={callerInfo?.username || 'User'} />}

      {isReceivingCall && (
        <div className="fixed top-5 right-5 bg-gray-800 p-4 rounded-lg shadow-lg z-50 border border-gray-700">
            <p><span className="font-bold">{callerInfo?.username}</span> is calling...</p>
            <div className="mt-3 flex justify-end space-x-2">
                <button onClick={answerCall} className="bg-green-500 hover:bg-green-600 px-3 py-1 rounded-md text-sm font-semibold">Answer</button>
                <button onClick={() => setIsReceivingCall(false)} className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded-md text-sm font-semibold">Decline</button>
            </div>
        </div>
      )}

      <header className="p-4 flex justify-between items-center border-b border-gray-800">
        <div className="flex-1">
          <h1 className="text-xl font-bold">kernel<span className="font-mono text-purple-400">[chat]</span></h1>
          <p className="text-sm text-gray-500 font-mono hidden md:block">{roomId}</p>
        </div>

        <div className="flex items-center space-x-4">
            <div className="relative">
                <button onClick={() => setIsUserListVisible(!isUserListVisible)} className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors">
                    <FiUsers className="w-6 h-6" />
                    <span>{onlineUsers.length}</span>
                </button>
                {isUserListVisible && (
                    <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 z-20">
                        <p className="px-4 py-2 text-xs text-gray-500 font-bold uppercase">Online Users</p>
                        {onlineUsers.map((user) => (
                            <div key={user.id} className="px-4 py-2 flex justify-between items-center hover:bg-gray-700/50">
                                <span>{user.username}{user.id === socket.id && ' (You)'}</span>
                                {user.id !== socket.id && !isInCall && (
                                    <button onClick={() => { startCall(user); setIsUserListVisible(false); }} className="text-green-400 hover:text-green-300">
                                        <FiPhone className="h-5 w-5" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
      </header>
      
      <main ref={messageContainerRef} className="flex-grow p-4 overflow-y-auto">
        {messages.map((msg, index) => (
          <div key={index} className={`mb-4 flex ${msg.sender === username ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs md:max-w-md`}>
              <p className={`text-xs mb-1 ${msg.sender === username ? 'text-right' : 'text-left'} text-gray-500`}>
                {msg.sender === username ? 'You' : msg.sender}
              </p>
              <div className={`px-4 py-2 rounded-xl ${msg.sender === username ? 'bg-purple-600' : 'bg-gray-800'}`}>
                <p className="break-words">{msg.content}</p>
              </div>
            </div>
          </div>
        ))}
      </main>

      <footer className="p-4">
        <div className="flex bg-gray-900 border border-gray-700 rounded-lg p-1">
          <input
            type="text"
            value={currentMessage}
            placeholder="Type your message..."
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            className="flex-grow p-2 bg-transparent text-white focus:outline-none"
          />
          <button onClick={sendMessage} className="bg-purple-600 text-white px-4 rounded-md hover:bg-purple-700 transition-colors duration-200">
            Send
          </button>
        </div>
      </footer>
    </div>
  );
};

export default ChatRoom;