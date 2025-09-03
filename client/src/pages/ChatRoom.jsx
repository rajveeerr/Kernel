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
  const [oldMessagesLoaded, setOldMessagesLoaded] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [isInCall, setIsInCall] = useState(false);
  const [isReceivingCall, setIsReceivingCall] = useState(false);
  const [callerInfo, setCallerInfo] = useState(null);
  const [isMuted, setIsMuted] = useState(false);

  const peerConnectionRef = useRef(null); 
  const localStreamRef = useRef(null); 
  const remoteAudioRef = useRef(null); 
  const messageContainerRef = useRef(null);

  const toggleMute = useCallback(async () => {
    try {
      if (!localStreamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;
        if (peerConnectionRef.current) stream.getTracks().forEach(track => peerConnectionRef.current.addTrack(track, stream));
      }

      setIsMuted(prev => {
        const newMuted = !prev;
        localStreamRef.current.getAudioTracks().forEach(track => { track.enabled = !newMuted; });
        return newMuted;
      });
    } catch (err) {
      console.error('toggleMute error', err);
      toast.error('Could not access microphone.');
    }
  }, []);


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
      const messageWithTimestamp = {
        ...data,
        timestamp: data.timestamp || new Date().toISOString()
      };
      setMessages((prev) => [...prev, messageWithTimestamp]);
    };

    const userListListener = (users) => {
      setOnlineUsers(users);
    };

    const loadOldMessagesListener = (oldMessages) => {
      const formattedMessages = oldMessages.map(msg => ({
        roomId: msg.roomId,
        sender: msg.sender,
        content: msg.content,
        timestamp: msg.createdAt,
        isOldMessage: true
      }));
      setMessages(formattedMessages);
      setOldMessagesLoaded(true);
      setLoadingMessages(false);
    };

    const callMadeListener = async (data) => {
      try {
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
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = event.streams[0];
          }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        setIsReceivingCall(true);
      } catch (error) {
        console.error('Error handling incoming call:', error);
        toast.error('Could not handle incoming call.');
      }
    };

    const answerMadeListener = async (data) => {
      try {
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
      } catch (error) {
        console.error('Error setting remote description:', error);
      }
    };

    const iceCandidateListener = (data) => {
      try {
        if (peerConnectionRef.current) {
          peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    };

    const messageErrorListener = (data) => {
      toast.error(data.error || 'Failed to send message');
    };

    socket.on('receive_message', messageListener);
    socket.on('update_user_list', userListListener);
    socket.on('load_old_messages', loadOldMessagesListener);
    socket.on('call-made', callMadeListener);
    socket.on('answer-made', answerMadeListener);
    socket.on('ice-candidate', iceCandidateListener);
    socket.on('message_error', messageErrorListener);

    return () => {
      socket.off('receive_message', messageListener);
      socket.off('update_user_list', userListListener);
      socket.off('load_old_messages', loadOldMessagesListener);
      socket.off('call-made', callMadeListener);
      socket.off('answer-made', answerMadeListener);
      socket.off('ice-candidate', iceCandidateListener);
      socket.off('message_error', messageErrorListener);
    };
  }, [roomId, username]);


  const handleUsernameSubmit = (name) => {
    setUsername(name);
    setShowModal(false);
    setLoadingMessages(true);
  };

  const sendMessage = async () => {
    if (currentMessage.trim() !== '' && username) {
      const messageData = { 
        roomId, 
        sender: username, 
        content: currentMessage,
        timestamp: new Date().toISOString()
      };
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
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
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
    try {
      if (peerConnectionRef.current && callerInfo) {
        socket.emit('make-answer', {
          to: callerInfo.id,
          answer: peerConnectionRef.current.localDescription
        });
        setIsReceivingCall(false);
        setIsInCall(true);
        toast.success('Call answered!');
      }
    } catch (error) {
      console.error('Error answering call:', error);
      toast.error('Could not answer call.');
    }
  };

  const declineCall = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    setIsReceivingCall(false);
    setCallerInfo(null);
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
      <audio ref={remoteAudioRef} autoPlay playsInline />
      
      {isInCall && (
        <CallUI 
          isVisible={isInCall}
          localUsername={username}
          remoteUsername={callerInfo?.username || 'User'}
          isMuted={isMuted}
          onToggleMute={toggleMute}
          onEndCall={endCall}
        />
      )}

      {isReceivingCall && (
        <div className="fixed top-5 right-5 bg-gray-800 p-4 rounded-lg shadow-lg z-50 border border-gray-700">
            <p><span className="font-bold">{callerInfo?.username}</span> is calling...</p>
            <div className="mt-3 flex justify-end space-x-2">
                <button onClick={answerCall} className="bg-green-500 hover:bg-green-600 px-3 py-1 rounded-md text-sm font-semibold">Answer</button>
                <button onClick={declineCall} className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded-md text-sm font-semibold">Decline</button>
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
        {loadingMessages && (
          <div className="flex justify-center items-center py-4">
            <div className="text-gray-500 text-sm">Loading chat history...</div>
          </div>
        )}
        
        {messages.map((msg, index) => {
          const isFirstNewMessage = index > 0 && 
            messages[index - 1].isOldMessage && 
            !msg.isOldMessage && 
            oldMessagesLoaded;
          
          return (
            <div key={index}>
              {isFirstNewMessage && (
                <div className="flex items-center my-6">
                  <div className="flex-grow border-t border-gray-600"></div>
                  <div className="px-4 text-xs text-gray-500 bg-black">New Messages</div>
                  <div className="flex-grow border-t border-gray-600"></div>
                </div>
              )}
              <div className={`mb-4 flex ${msg.sender === username ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs md:max-w-md`}>
                  <div className={`flex items-center gap-2 mb-1 ${msg.sender === username ? 'justify-end' : 'justify-start'}`}>
                    <p className={`text-xs text-gray-500`}>
                      {msg.sender === username ? 'You' : msg.sender}
                    </p>
                    {msg.timestamp && (
                      <p className="text-xs text-gray-600">
                        {new Date(msg.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    )}
                  </div>
                  <div className={`px-4 py-2 rounded-xl ${
                    msg.sender === username 
                      ? 'bg-purple-600' 
                      : msg.isOldMessage 
                        ? 'bg-gray-700' 
                        : 'bg-gray-800'
                  }`}>
                    <p className="break-words">{msg.content}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        
        {!loadingMessages && messages.length === 0 && (
          <div className="flex justify-center items-center py-8">
            <div className="text-gray-500 text-sm">No messages yet. Start the conversation!</div>
          </div>
        )}
      </main>

      <footer className="p-4">
        <div className="flex bg-gray-900 border border-gray-700 rounded-full p-1">
          <input
            type="text"
            value={currentMessage}
            placeholder="Type your message and press enter..."
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            className="flex-grow p-2 bg-transparent text-white focus:outline-none"
          />
          <button onClick={sendMessage} className="bg-purple-600 text-white px-4 rounded-full hover:bg-purple-700 transition-colors duration-200">
            Send
          </button>
        </div>
      </footer>
    </div>
  );
};

export default ChatRoom;