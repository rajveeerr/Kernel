import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import toast from 'react-hot-toast';
import UsernameModal from '../components/UsernameModal';
import CallUI from '../components/callUI';

const SOCKET_SERVER_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
const socket = io.connect(SOCKET_SERVER_URL);

const ChatRoom = () => {
  const { roomId } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [showModal, setShowModal] = useState(false);
   const [onlineUsers, setOnlineUsers] = useState([]);
  const [isInCall, setIsInCall] = useState(false);
  const [isReceivingCall, setIsReceivingCall] = useState(false);
  const [callerInfo, setCallerInfo] = useState(null);
  const [isUserListVisible, setIsUserListVisible] = useState(true);

 const peerConnectionRef = useRef(null); 
  const localStreamRef = useRef(null); 
  const remoteStreamRef = useRef(null); 

  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
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
    if(!username){
      return;
    }

    socket.emit('join_room', {roomId,username});


    const messageListener = (data) => {
      setMessages((prev) => [...prev, data]);
    };

    
    const userListListener = (users) => {
      setOnlineUsers(users);
    };
    
    const callMadeListener=async (data)=>{
      const {offer,from}=data;
      setCallerInfo(from);

    const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      peerConnectionRef.current = pc;

    const stream=navigator.mediaDevices.getUserMedia({audio:true,video:false});
    localStreamRef.current=stream;
    stream.getTracks().forEach(track=>pc.addTrack(track,stream));

    pc.onicecandidate=(event)=>{
      if(event.candidate){
        socket.emit('ice_candidate', {candidate:event.candidate,roomId});
      }
    }

     pc.ontrack = (event) => {
        remoteStreamRef.current.srcObject = event.streams[0];
      };


      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      setIsReceivingCall(true);

    }

     const answerMadeListener = async (data) => {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
    };

    const iceCandidateListener = (data) => {
      peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
    };



    socket.on('update_user_list', userListListener);
    socket.on('call-made', callMadeListener);
    socket.on('answer-made', answerMadeListener);
    socket.on('ice-candidate', iceCandidateListener);
    socket.on('receive_message', messageListener);

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
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] // Google's public STUN server
    });
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
      remoteStreamRef.current.srcObject = event.streams[0];
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    const currentUser = onlineUsers.find(u => u.id === socket.id);
    socket.emit('call-user', { to: targetUser.id, from: currentUser, offer });
    setIsInCall(true);
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
    <div className="bg-gray-900 flex flex-col h-screen text-white">
      <audio ref={remoteStreamRef} autoPlay playsInline />

      {isInCall && <CallUI onEndCall={endCall} />}

      {isReceivingCall && (
        <div className="fixed top-5 right-5 bg-gray-700 p-4 rounded-lg shadow-lg z-50">
            <p>{callerInfo?.username} is calling you...</p>
            <div className="mt-2 flex justify-end space-x-2">
                <button onClick={answerCall} className="bg-green-500 px-3 py-1 rounded">Answer</button>
                <button onClick={() => setIsReceivingCall(false)} className="bg-red-500 px-3 py-1 rounded">Decline</button>
            </div>
        </div>
      )}

      <header className="bg-gray-800 p-4 shadow-md flex justify-between items-center">
        {isUserListVisible && (
            <div className="absolute right-0 mt-2 w-48 bg-gray-700 rounded-md shadow-lg py-1 z-20">
                {onlineUsers.map((user) => (
                    <div key={user.id} className="px-4 py-2 text-sm text-gray-200 flex justify-between items-center">
                        <span>{user.username}{user.id === socket.id && ' (You)'}</span>
                        {user.id !== socket.id && !isInCall && (
                            <button onClick={() => startCall(user)} className="text-green-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                                </svg>
                            </button>
                        )}
                    </div>
                ))}
            </div>
        )}
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

      <footer className="bg-gray-900 p-4">
        <div className="flex">
          <input
            type="text"
            value={currentMessage}
            placeholder="Type your message..."
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            className="flex-grow p-2 bg-gray-800 border-gray-700 text-white rounded-l-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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