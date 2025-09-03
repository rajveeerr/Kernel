import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import toast from 'react-hot-toast';
import UsernameModal from '../components/UsernameModal';
import { FiUsers, FiPhone, FiPaperclip, FiMic, FiSend } from 'react-icons/fi';
import CallUI from '../components/CallUI';




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

  const scrollToBottom = useCallback((behavior = 'auto') => {
    const el = messageContainerRef.current;
    if (!el) return;
    setTimeout(() => {
      try {
        el.scrollTo({ top: el.scrollHeight, behavior });
      } catch (e) {
        el.scrollTop = el.scrollHeight;
      }
    }, 50);
  }, []);

  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages, oldMessagesLoaded, scrollToBottom]);

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
  <div className="bg-black w-full items-center bg-gradient-to-b from-black via-purple-900/10 to-black min-h-screen flex flex-col text-white font-sans">
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
            <div className="fixed inset-x-0 top-6 flex justify-center z-50 pointer-events-none">
              <div className="pointer-events-auto bg-gray-900/70 backdrop-blur-sm border border-gray-800 px-4 py-3 rounded-full flex items-center gap-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-200 font-semibold">Incoming call</span>
                    <span className="text-xs text-gray-400">{callerInfo?.username || 'Unknown'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={answerCall} className="bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded-md text-sm font-semibold">Answer</button>
                  <button onClick={declineCall} className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded-md text-sm font-semibold">Decline</button>
                </div>
              </div>
            </div>
          )}

      <header className="static  w-full py-6">
        <div className="absolute hidden inset-x-0 top-2 sm:flex justify-center pointer-events-none">
          <div className="pointer-events-auto bg-gray-900/60 border border-gray-800 backdrop-blur-sm px-4 py-2 rounded-full shadow-md flex items-center gap-3">
            <h2 className="text-sm text-gray-300 font-semibold tracking-wide">{roomId || 'Group Chat'}</h2>
            <div className="px-2 py-1 text-xs bg-purple-800/30 text-purple-300 rounded-full">{onlineUsers.length} online</div>
          </div>
        </div>

        <div className="px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center">●</div> */}
            <h1 className="text-lg font-bold">kernel<span className="font-mono text-purple-400">[chat]</span></h1>
          </div>

          <div className="relative">
            <button onClick={() => setIsUserListVisible(!isUserListVisible)} className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors">
              <FiUsers className="w-6 h-6" />
              <span className="text-sm">{onlineUsers.length}</span>
            </button>
            {isUserListVisible && (
              <div className="absolute right-0 mt-2 w-64 bg-black/50 backdrop-blur-sm border border-gray-800 rounded-2xl shadow-lg py-2 z-30">
                <div className="px-4 py-2 flex items-center justify-between">
                  <p className="text-xs text-gray-300 font-semibold">Online Users</p>
                  <span className="text-xs bg-purple-800/30 text-purple-300 px-2 py-1 rounded-full">{onlineUsers.length}</span>
                </div>

                <div className="max-h-64 overflow-y-auto">
                  {onlineUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => { }}
                      className="w-full text-left px-4 py-2 flex items-center gap-3 hover:bg-purple-900/10 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-sm text-gray-300">
                        {user.username ? user.username.charAt(0).toUpperCase() : '?'}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-100 font-medium">{user.username}{user.id === socket.id && ' (You)'}</span>
                          {user.id !== socket.id && !isInCall && (
                            <button
                              onClick={(e) => { e.stopPropagation(); startCall(user); setIsUserListVisible(false); }}
                              className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-md"
                              aria-label={`Call ${user.username}`}
                            >
                              <FiPhone className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">{user.status || 'Available'}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
      
  <main ref={messageContainerRef} className="flex-grow w-full p-4 pb-40 h-[80vh] max-w-6xl overflow-y-auto">
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
                  <div className={`px-4 py-2 rounded-4xl ${
                    msg.sender === username 
                      ? 'bg-purple-600 rounded-br-xl' 
                      : msg.isOldMessage 
                        ? 'bg-gray-700 rounded-bl-xl' 
                        : 'bg-gray-800 rounded-bl-xl '
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

  <footer className="p-6 fixed inset-x-0 bottom-0">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-3 bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-3xl p-3">      
            <input
              type="text"
              value={currentMessage}
              placeholder="Type anything and press Enter"
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              className="flex-grow bg-transparent text-gray-200 placeholder-gray-400 focus:outline-none px-4 py-3"
            />

            <button onClick={sendMessage} aria-label="Send" className="w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-700 flex items-center justify-center transition-shadow shadow-md">
              <FiSend className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </footer>

  <div className="h-8" />
    </div>
  );
};

export default ChatRoom;