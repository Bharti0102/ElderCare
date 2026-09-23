import { io, Socket } from 'socket.io-client';

export interface WebRTCCallOptions {
  callId: string;
  userId?: string;
  onRemoteStream?: (stream: MediaStream) => void;
  onAudioLevel?: (level: number) => void;
  onCallEnded?: () => void;
  onError?: (err: Error) => void;
}

export class WebRTCService {
  private static socket: Socket | null = null;
  private static peerConnection: RTCPeerConnection | null = null;
  private static localStream: MediaStream | null = null;
  private static remoteAudioElement: HTMLAudioElement | null = null;
  private static audioContext: AudioContext | null = null;
  private static analyser: AnalyserNode | null = null;
  private static animFrameId: number | null = null;
  private static isMicMuted: boolean = false;
  private static currentCallId: string | null = null;

  private static readonly ICE_SERVERS: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ],
  };

  /**
   * Initialize Socket.IO signaling connection
   */
  private static getSocket(): Socket {
    if (!this.socket) {
      const serverUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin;
      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        withCredentials: true,
      });

      this.socket.on('connect', () => {
        console.log('[WebRTCService] Connected to WebRTC signaling server');
      });

      this.socket.on('connect_error', (err) => {
        console.warn('[WebRTCService] Signaling server connection notice:', err.message);
      });
    }
    return this.socket;
  }

  /**
   * Start an in-browser WebRTC audio call session
   */
  public static async startCall(options: WebRTCCallOptions): Promise<MediaStream> {
    this.currentCallId = options.callId;
    this.isMicMuted = false;

    // 1. Capture microphone audio stream
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
    } catch (err: any) {
      console.error('[WebRTCService] Microphone access error:', err);
      throw new Error('Microphone permission required to place an in-browser audio call.');
    }

    // 2. Setup real-time audio volume visualizer
    this.setupAudioVisualizer(this.localStream, options.onAudioLevel);

    // 3. Initialize RTCPeerConnection
    this.peerConnection = new RTCPeerConnection(this.ICE_SERVERS);

    // Add local audio tracks to peer connection
    this.localStream.getTracks().forEach((track) => {
      if (this.peerConnection && this.localStream) {
        this.peerConnection.addTrack(track, this.localStream);
      }
    });

    // 4. Setup remote audio receiver
    this.peerConnection.ontrack = (event) => {
      console.log('[WebRTCService] Remote audio track received!');
      const remoteStream = event.streams[0];
      if (options.onRemoteStream) {
        options.onRemoteStream(remoteStream);
      }
      this.playRemoteStream(remoteStream);
    };

    // 5. Setup signaling via Socket.IO
    const socket = this.getSocket();

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.currentCallId) {
        socket.emit('webrtc-ice-candidate', {
          callId: this.currentCallId,
          candidate: event.candidate,
        });
      }
    };

    socket.emit('webrtc-join', {
      callId: options.callId,
      userId: options.userId || 'patient',
    });

    socket.off('webrtc-offer');
    socket.off('webrtc-answer');
    socket.off('webrtc-ice-candidate');
    socket.off('webrtc-hangup');
    socket.off('webrtc-peer-joined');

    // When the other person (caregiver guest) joins the room, send an offer immediately
    socket.on('webrtc-peer-joined', async () => {
      console.log('[WebRTCService] Caregiver joined room! Initiating audio offer...');
      try {
        if (!this.peerConnection) return;
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        socket.emit('webrtc-offer', {
          callId: options.callId,
          sdp: offer,
        });
      } catch (e) {
        console.error('[WebRTCService] Error creating renegotiation offer:', e);
      }
    });

    socket.on('webrtc-offer', async ({ sdp }) => {
      try {
        if (!this.peerConnection) return;
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        socket.emit('webrtc-answer', {
          callId: options.callId,
          sdp: answer,
        });
      } catch (e) {
        console.error('[WebRTCService] Error handling offer:', e);
      }
    });

    socket.on('webrtc-answer', async ({ sdp }) => {
      try {
        if (!this.peerConnection) return;
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
      } catch (e) {
        console.error('[WebRTCService] Error handling answer:', e);
      }
    });

    socket.on('webrtc-ice-candidate', async ({ candidate }) => {
      try {
        if (!this.peerConnection) return;
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('[WebRTCService] Candidate error:', e);
      }
    });

    socket.on('webrtc-hangup', () => {
      console.log('[WebRTCService] Call hung up by peer');
      this.endCall();
      if (options.onCallEnded) options.onCallEnded();
    });

    // 6. Create initial Offer
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      socket.emit('webrtc-offer', {
        callId: options.callId,
        sdp: offer,
      });
    } catch (e) {
      console.warn('[WebRTCService] Notice creating offer:', e);
    }

    return this.localStream;
  }

  /**
   * Join an existing WebRTC call session as an answering peer (guest caregiver)
   */
  public static async joinCall(options: WebRTCCallOptions): Promise<MediaStream> {
    this.currentCallId = options.callId;
    this.isMicMuted = false;

    // 1. Capture microphone audio stream
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
    } catch (err: any) {
      console.error('[WebRTCService] Microphone access error:', err);
      throw new Error('Microphone permission is required to join the audio call.');
    }

    // 2. Setup real-time audio volume visualizer
    this.setupAudioVisualizer(this.localStream, options.onAudioLevel);

    // 3. Initialize RTCPeerConnection
    this.peerConnection = new RTCPeerConnection(this.ICE_SERVERS);

    this.localStream.getTracks().forEach((track) => {
      if (this.peerConnection && this.localStream) {
        this.peerConnection.addTrack(track, this.localStream);
      }
    });

    // 4. Setup remote audio playback
    this.peerConnection.ontrack = (event) => {
      console.log('[WebRTCService] Connected! Playing remote audio from patient...');
      const remoteStream = event.streams[0];
      if (options.onRemoteStream) {
        options.onRemoteStream(remoteStream);
      }
      this.playRemoteStream(remoteStream);
    };

    // 5. Setup signaling via Socket.IO
    const socket = this.getSocket();

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.currentCallId) {
        socket.emit('webrtc-ice-candidate', {
          callId: this.currentCallId,
          candidate: event.candidate,
        });
      }
    };

    socket.off('webrtc-offer');
    socket.off('webrtc-answer');
    socket.off('webrtc-ice-candidate');
    socket.off('webrtc-hangup');

    socket.on('webrtc-offer', async ({ sdp }) => {
      try {
        if (!this.peerConnection) return;
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        socket.emit('webrtc-answer', {
          callId: options.callId,
          sdp: answer,
        });
        console.log('[WebRTCService] Answer sent to caller successfully');
      } catch (e) {
        console.error('[WebRTCService] Error answering offer:', e);
      }
    });

    socket.on('webrtc-ice-candidate', async ({ candidate }) => {
      try {
        if (!this.peerConnection) return;
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('[WebRTCService] Candidate error:', e);
      }
    });

    socket.on('webrtc-hangup', () => {
      console.log('[WebRTCService] Call hung up by caller');
      this.endCall();
      if (options.onCallEnded) options.onCallEnded();
    });

    // Notify caller that guest has joined
    socket.emit('webrtc-join', {
      callId: options.callId,
      userId: options.userId || 'caregiver-guest',
    });

    return this.localStream;
  }

  /**
   * Play remote stream through device speakers
   */
  private static playRemoteStream(stream: MediaStream) {
    if (!this.remoteAudioElement) {
      this.remoteAudioElement = new Audio();
      this.remoteAudioElement.autoplay = true;
    }
    this.remoteAudioElement.srcObject = stream;
    this.remoteAudioElement.play().catch((err) => {
      console.warn('[WebRTCService] Audio autoplay notice:', err);
    });
  }

  /**
   * Real-time mic audio visualizer
   */
  private static setupAudioVisualizer(stream: MediaStream, onAudioLevel?: (level: number) => void) {
    if (!onAudioLevel) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);

      const buffer = new Uint8Array(this.analyser.frequencyBinCount);

      const updateLevel = () => {
        if (!this.analyser) return;
        this.analyser.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i];
        }
        const avg = sum / buffer.length;
        const normalized = Math.min(100, Math.round((avg / 255) * 100));
        onAudioLevel(normalized);
        this.animFrameId = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch {
      // AudioContext fallback
    }
  }

  /**
   * Toggle microphone mute / unmute
   */
  public static toggleMute(): boolean {
    if (!this.localStream) return false;
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      this.isMicMuted = !this.isMicMuted;
      audioTrack.enabled = !this.isMicMuted;
    }
    return this.isMicMuted;
  }

  public static isMuted(): boolean {
    return this.isMicMuted;
  }

  /**
   * End current WebRTC call and cleanup resources
   */
  public static endCall() {
    if (this.currentCallId && this.socket) {
      this.socket.emit('webrtc-hangup', { callId: this.currentCallId });
    }

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.remoteAudioElement) {
      this.remoteAudioElement.pause();
      this.remoteAudioElement.srcObject = null;
      this.remoteAudioElement = null;
    }

    this.currentCallId = null;
    this.isMicMuted = false;
    console.log('[WebRTCService] Cleaned up all WebRTC media & connection resources');
  }
}
