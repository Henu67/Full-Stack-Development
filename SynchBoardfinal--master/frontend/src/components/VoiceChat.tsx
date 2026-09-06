import React, { useEffect, useRef, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Mic, MicOff, PhoneOff } from 'lucide-react';
import toast from 'react-hot-toast';

interface VoiceChatProps {
  roomId: string;
  onLeave: () => void;
}

const VoiceChat: React.FC<VoiceChatProps> = ({ roomId, onLeave }) => {
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  
  const [isMuted, setIsMuted] = useState(false);
  const [peers, setPeers] = useState<{ [id: string]: { user: any, stream?: MediaStream } }>({});
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<{ [id: string]: RTCPeerConnection }>({});
  const audioRefs = useRef<{ [id: string]: HTMLAudioElement }>({});

  const ICE_SERVERS = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' }
    ]
  };

  useEffect(() => {
    if (!socket || !isConnected) return;

    const initAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        
        socket.emit('webrtc-join', roomId, { name: user?.name || user?.email, avatar: user?.avatar });

        // Listen for others joining
        socket.on('webrtc-user-joined', async (data) => {
          const { socketId, user: remoteUser } = data;
          setPeers(prev => ({ ...prev, [socketId]: { user: remoteUser } }));
          await createOffer(socketId, remoteUser);
        });

        socket.on('webrtc-offer', async (data) => {
          const { offer, from, user: remoteUser } = data;
          setPeers(prev => ({ ...prev, [from]: { user: remoteUser } }));
          await handleOffer(offer, from);
        });

        socket.on('webrtc-answer', async (data) => {
          const { answer, from } = data;
          await handleAnswer(answer, from);
        });

        socket.on('webrtc-ice-candidate', (data) => {
          const { candidate, from } = data;
          handleIceCandidate(candidate, from);
        });

        socket.on('webrtc-user-left', (socketId) => {
          if (peersRef.current[socketId]) {
            peersRef.current[socketId].close();
            delete peersRef.current[socketId];
          }
          setPeers(prev => {
            const next = { ...prev };
            delete next[socketId];
            return next;
          });
        });

      } catch (err) {
        toast.error('Microphone access denied or unavailable.');
        console.error(err);
        onLeave();
      }
    };

    initAudio();

    return () => {
      socket.emit('webrtc-leave', roomId);
      socket.off('webrtc-user-joined');
      socket.off('webrtc-offer');
      socket.off('webrtc-answer');
      socket.off('webrtc-ice-candidate');
      socket.off('webrtc-user-left');
      
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      Object.values(peersRef.current).forEach(pc => pc.close());
    };
  }, [socket, isConnected, roomId, user]);

  const createPeerConnection = (socketId: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.emit('webrtc-ice-candidate', {
          to: socketId,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      setPeers(prev => ({
        ...prev,
        [socketId]: { ...prev[socketId], stream: event.streams[0] }
      }));
    };

    peersRef.current[socketId] = pc;
    return pc;
  };

  const createOffer = async (socketId: string, _remoteUser: any) => {
    const pc = createPeerConnection(socketId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket?.emit('webrtc-offer', {
      to: socketId,
      offer,
      user: { name: user?.name || user?.email, avatar: user?.avatar }
    });
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit, from: string) => {
    const pc = createPeerConnection(from);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket?.emit('webrtc-answer', {
      to: from,
      answer
    });
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit, from: string) => {
    const pc = peersRef.current[from];
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  };

  const handleIceCandidate = async (candidate: RTCIceCandidateInit, from: string) => {
    const pc = peersRef.current[from];
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Attach audio streams to elements when they change
  useEffect(() => {
    Object.entries(peers).forEach(([id, peer]) => {
      if (peer.stream && audioRefs.current[id]) {
        audioRefs.current[id].srcObject = peer.stream;
      }
    });
  }, [peers]);

  return (
    <div className="bg-gray-900 rounded-xl p-4 flex flex-col gap-4 text-white w-64 shadow-2xl border border-gray-700">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Voice Channel
        </h3>
        <span className="text-xs text-gray-400">{Object.keys(peers).length + 1} online</span>
      </div>
      
      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
        {/* Local User */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center overflow-hidden">
              {user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover"/> : <span className="text-[10px]">{user?.name?.[0] || 'U'}</span>}
            </div>
            <span className="text-sm font-medium truncate w-24">You</span>
          </div>
          {isMuted ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4 text-green-400" />}
        </div>

        {/* Remote Users */}
        {Object.entries(peers).map(([id, peer]) => (
          <div key={id} className="flex items-center justify-between p-2 rounded-lg bg-gray-800/50">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-indigo-400 flex items-center justify-center overflow-hidden">
                {peer.user?.avatar ? <img src={peer.user.avatar} className="w-full h-full object-cover"/> : <span className="text-[10px]">{peer.user?.name?.[0] || 'U'}</span>}
              </div>
              <span className="text-sm text-gray-300 truncate w-24">{peer.user?.name || 'User'}</span>
            </div>
            <audio ref={el => { if (el) audioRefs.current[id] = el; }} autoPlay playsInline />
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-2 pt-2 border-t border-gray-700">
        <button 
          onClick={toggleMute}
          className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg text-sm font-medium transition-colors ${isMuted ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
        >
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          {isMuted ? 'Unmute' : 'Mute'}
        </button>
        <button 
          onClick={onLeave}
          className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
          title="Disconnect"
        >
          <PhoneOff className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default VoiceChat;
