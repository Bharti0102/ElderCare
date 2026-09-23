import { io, Socket } from 'socket.io-client';

export interface WebRTCCallOptions {
  callId: string;
  userId?: string;
  video?: boolean;
  onRemoteStream?: (stream: MediaStream) => void;
  onLocalStream?: (stream: MediaStream) => void;
  onAudioLevel?: (level: number) => void;
  onCallConnected?: () => void;
  onCallEnded?: () => void;
  onError?: (err: Error) => void;
}

export class WebRTCService {
  private static socket: Socket | null = null;
  private static peerConnection: RTCPeerConnection | null = null;
  private static localStream: MediaStream | null = null;
  private static remoteStream: MediaStream | null = null;
  private static remoteAudioElement: HTMLAudioElement | null = null;
  private static audioContext: AudioContext | null = null;
  private static analyser: AnalyserNode | null = null;
  private static animFrameId: number | null = null;
  private static isMicMuted: boolean = false;
  private static isCameraOff: boolean = false;
  private static currentCallId: string | null = null;
  private static onLocalStreamCallback: ((stream: MediaStream) => void) | null = null;
  private static onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;

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
   * Start an in-browser WebRTC audio/video call session (caller side)
   */
  public static async startCall(options: WebRTCCallOptions): Promise<MediaStream> {
    this.currentCallId = options.callId;
    this.isMicMuted = false;
    this.onLocalStreamCallback = options.onLocalStream || null;
    this.onRemoteStreamCallback = options.onRemoteStream || null;

    // 1. Capture media stream (audio + optional video)
    try {
      if (options.video !== false) {
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            video: {
              facingMode: 'user',
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          });
          this.isCameraOff = false;
        } catch (videoErr) {
          console.warn('[WebRTCService] Camera unavailable or denied, falling back to audio only:', videoErr);
          this.localStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            video: false,
          });
          this.isCameraOff = true;
        }
      } else {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });
        this.isCameraOff = true;
      }
    } catch (err: any) {
      console.error('[WebRTCService] Media access error:', err);
      throw new Error('Microphone permission required to place an in-browser call.');
    }

    if (this.onLocalStreamCallback && this.localStream) {
      this.onLocalStreamCallback(this.localStream);
    }

    // 2. Setup real-time audio volume visualizer
    this.setupAudioVisualizer(this.localStream, options.onAudioLevel);

    // 3. Initialize RTCPeerConnection
    this.peerConnection = new RTCPeerConnection(this.ICE_SERVERS);

    // Add local tracks (audio + video) to peer connection
    this.localStream.getTracks().forEach((track) => {
      if (this.peerConnection && this.localStream) {
        this.peerConnection.addTrack(track, this.localStream);
      }
    });

    // 4. Setup remote media receiver
    this.peerConnection.ontrack = (event) => {
      console.log(`[WebRTCService] Remote track received: ${event.track.kind}`);
      const remoteStream = event.streams[0] || new MediaStream([event.track]);
      this.remoteStream = remoteStream;

      if (options.onCallConnected) {
        options.onCallConnected();
      }
      if (this.onRemoteStreamCallback) {
        this.onRemoteStreamCallback(remoteStream);
      }
      if (options.onRemoteStream) {
        options.onRemoteStream(remoteStream);
      }
      this.playRemoteStream(remoteStream);
    };

    // Monitor connection state
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log(`[WebRTCService] Connection state changed: ${state}`);
      if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        console.log('[WebRTCService] Remote peer disconnected. Ending call session.');
        this.endCall();
        if (options.onCallEnded) options.onCallEnded();
      }
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

    // When the receiver joins the room, send an offer immediately
    socket.on('webrtc-peer-joined', async () => {
      console.log('[WebRTCService] Caregiver joined room! Initiating SDP offer...');
      if (options.onCallConnected) {
        options.onCallConnected();
      }
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
        if (options.onCallConnected) {
          options.onCallConnected();
        }
      } catch (e) {
        console.error('[WebRTCService] Error handling offer:', e);
      }
    });

    socket.on('webrtc-answer', async ({ sdp }) => {
      try {
        if (!this.peerConnection) return;
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
        console.log('[WebRTCService] Remote peer answered. Call is live!');
        if (options.onCallConnected) {
          options.onCallConnected();
        }
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
      console.warn('[WebRTCService] Notice creating initial offer:', e);
    }

    return this.localStream;
  }

  /**
   * Join an existing WebRTC call session as an answering peer (guest caregiver)
   */
  public static async joinCall(options: WebRTCCallOptions): Promise<MediaStream> {
    this.currentCallId = options.callId;
    this.isMicMuted = false;
    this.onLocalStreamCallback = options.onLocalStream || null;
    this.onRemoteStreamCallback = options.onRemoteStream || null;

    // 1. Capture media stream (audio + optional video)
    try {
      if (options.video !== false) {
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            video: {
              facingMode: 'user',
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          });
          this.isCameraOff = false;
        } catch (videoErr) {
          console.warn('[WebRTCService] Camera unavailable or denied on guest device, falling back to audio only:', videoErr);
          this.localStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            video: false,
          });
          this.isCameraOff = true;
        }
      } else {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });
        this.isCameraOff = true;
      }
    } catch (err: any) {
      console.error('[WebRTCService] Microphone access error:', err);
      throw new Error('Microphone permission is required to join the call.');
    }

    if (this.onLocalStreamCallback && this.localStream) {
      this.onLocalStreamCallback(this.localStream);
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

    // 4. Setup remote media playback
    this.peerConnection.ontrack = (event) => {
      console.log(`[WebRTCService] Connected! Remote track received: ${event.track.kind}`);
      const remoteStream = event.streams[0] || new MediaStream([event.track]);
      this.remoteStream = remoteStream;

      if (this.onRemoteStreamCallback) {
        this.onRemoteStreamCallback(remoteStream);
      }
      if (options.onRemoteStream) {
        options.onRemoteStream(remoteStream);
      }
      if (options.onCallConnected) {
        options.onCallConnected();
      }
      this.playRemoteStream(remoteStream);
    };

    // Monitor connection state on guest peer
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log(`[WebRTCService-Guest] Connection state changed: ${state}`);
      if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        console.log('[WebRTCService-Guest] Peer disconnected. Ending call session.');
        this.endCall();
        if (options.onCallEnded) options.onCallEnded();
      }
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
        if (options.onCallConnected) {
          options.onCallConnected();
        }
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
   * Helper to attach media stream to a HTMLVideoElement
   */
  public static attachVideo(element: HTMLVideoElement | null, stream: MediaStream | null) {
    if (!element) return;
    if (element.srcObject !== stream) {
      element.srcObject = stream;
      if (stream) {
        element.play().catch((err) => {
          console.warn('[WebRTCService] Video autoplay notice:', err.message);
        });
      }
    }
  }

  /**
   * Get active local media stream
   */
  public static getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Get active remote media stream
   */
  public static getRemoteStream(): MediaStream | null {
    return this.remoteStream;
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
   * Toggle camera video on / off
   */
  public static async toggleCamera(): Promise<boolean> {
    if (!this.localStream) return false;
    const videoTrack = this.localStream.getVideoTracks()[0];

    if (videoTrack) {
      this.isCameraOff = !this.isCameraOff;
      videoTrack.enabled = !this.isCameraOff;
      return !this.isCameraOff;
    }

    // If call started as audio-only, acquire camera and renegotiate
    try {
      const camStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      const newVideoTrack = camStream.getVideoTracks()[0];
      if (newVideoTrack) {
        this.localStream.addTrack(newVideoTrack);
        if (this.peerConnection) {
          this.peerConnection.addTrack(newVideoTrack, this.localStream);
          if (this.socket && this.currentCallId) {
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            this.socket.emit('webrtc-offer', {
              callId: this.currentCallId,
              sdp: offer,
            });
          }
        }
        this.isCameraOff = false;
        if (this.onLocalStreamCallback) {
          this.onLocalStreamCallback(this.localStream);
        }
        return true;
      }
    } catch (err) {
      console.warn('[WebRTCService] Camera acquisition notice:', err);
    }
    return false;
  }

  public static isCameraActive(): boolean {
    if (!this.localStream) return false;
    const videoTrack = this.localStream.getVideoTracks()[0];
    return !!videoTrack && videoTrack.enabled && !this.isCameraOff;
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

    this.remoteStream = null;

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
    this.isCameraOff = false;
    this.onLocalStreamCallback = null;
    this.onRemoteStreamCallback = null;
    console.log('[WebRTCService] Cleaned up all WebRTC media & connection resources');
  }
}
