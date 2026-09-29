import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { ReminderScheduler } from './services/reminder/reminder.scheduler';
import { CloudflareTunnelService } from './services/tunnel/cloudflare.tunnel';
import { CallingService } from './services/calling/calling.service';

let ioInstance: SocketIOServer | null = null;
export const getIO = (): SocketIOServer | null => ioInstance;

const startServer = async (): Promise<void> => {
  // Connect to MongoDB
  await connectDatabase();

  // Start background reminder scheduler
  ReminderScheduler.start(30000);

  // Auto-start Cloudflare Tunnel if configured
  if (env.AUTO_START_TUNNEL === 'true') {
    CloudflareTunnelService.startTunnel(5173).catch((err) => {
      console.warn('[Server] Cloudflare auto-tunnel note:', err.message);
    });
  }

  const app = createApp();
  const httpServer = http.createServer(app);

  // Setup WebRTC Socket.IO signaling server
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 45000,
    maxHttpBufferSize: 1e7,
    transports: ['websocket', 'polling'],
  });

  ioInstance = io;

  io.on('connection', (socket) => {
    // Caregiver device registration for direct in-app ringing
    socket.on('caregiver:register', ({ contactId, userId }) => {
      if (contactId) {
        socket.join(`contact:${contactId}`);
        console.log(`[Socket] Device registered for direct ringing on contact: ${contactId}`);
      }
      if (userId) {
        socket.join(`user:${userId}`);
        console.log(`[Socket] Device registered for direct ringing on user: ${userId}`);
      }
    });

    socket.on('call:decline', ({ callId }) => {
      if (callId) {
        socket.to(callId).emit('call:declined', { callId });
        CallingService.publicHangupCall(callId).catch(() => {});
      }
    });

    // Hospital Reception Desk (Receiver) socket signaling
    socket.on('hospital:reception:register', ({ receptionPhone }) => {
      socket.join('hospital:receptions');
      if (receptionPhone) {
        const clean = receptionPhone.replace(/[^0-9+]/g, '');
        socket.join(`reception:${clean}`);
        console.log(`[Socket] Registered Hospital Reception Desk (Receiver) for: ${clean}`);
      }
    });

    socket.on('hospital:call:dial', (data) => {
      const callRoom = `hospital:call:${data.callId}`;
      socket.join(callRoom);
      console.log(`[Socket] AI Agent dialing Hospital Reception: ${data.hospitalName} (${data.receptionPhone})`);
      // Broadcast incoming call to registered reception desks
      const clean = data.receptionPhone ? data.receptionPhone.replace(/[^0-9+]/g, '') : '';
      socket.to('hospital:receptions').emit('hospital:call:incoming', data);
      if (clean) {
        socket.to(`reception:${clean}`).emit('hospital:call:incoming', data);
      }
    });

    socket.on('hospital:call:answer', ({ callId }) => {
      console.log(`[Socket] Hospital Reception answered call: ${callId}`);
      io.to(`hospital:call:${callId}`).emit('hospital:call:connected', { callId });
    });

    socket.on('hospital:reception:speak', (data) => {
      console.log(`[Socket] Hospital Reception (Receiver) answered on call ${data.callId}: "${data.text}"`);
      io.to(`hospital:call:${data.callId}`).emit('hospital:reception:spoken', data);
    });

    socket.on('hospital:call:end', ({ callId }) => {
      io.to(`hospital:call:${callId}`).emit('hospital:call:ended', { callId });
    });
    socket.on('webrtc-join', ({ callId, userId }) => {
      socket.join(callId);
      console.log(`[WebRTC Signaling] Socket ${socket.id} joined room: ${callId}`);
      socket.to(callId).emit('webrtc-peer-joined', { socketId: socket.id, userId });
    });

    socket.on('webrtc-offer', ({ callId, sdp }) => {
      socket.to(callId).emit('webrtc-offer', { sdp, socketId: socket.id });
    });

    socket.on('webrtc-answer', ({ callId, sdp }) => {
      socket.to(callId).emit('webrtc-answer', { sdp, socketId: socket.id });
    });

    socket.on('webrtc-ice-candidate', ({ callId, candidate }) => {
      socket.to(callId).emit('webrtc-ice-candidate', { candidate, socketId: socket.id });
    });

    socket.on('webrtc-hangup', async ({ callId }) => {
      console.log(`[WebRTC Signaling] webrtc-hangup event for room: ${callId} from socket ${socket.id}`);
      socket.to(callId).emit('webrtc-hangup', { socketId: socket.id, callId });
      socket.leave(callId);
      if (callId) {
        try {
          await CallingService.publicHangupCall(callId);
        } catch {
          // ignore
        }
      }
    });

    socket.on('disconnecting', () => {
      for (const room of socket.rooms) {
        if (room !== socket.id) {
          console.log(`[WebRTC Signaling] Socket ${socket.id} disconnected, notifying room: ${room}`);
          socket.to(room).emit('webrtc-hangup', { socketId: socket.id, callId: room });
          CallingService.publicHangupCall(room).catch(() => {});
        }
      }
    });
  });

  const server = httpServer.listen(env.PORT, () => {
    console.log(`===============================================`);
    console.log(`ElderCare AI Server running in ${env.NODE_ENV} mode`);
    console.log(`Listening on: http://localhost:${env.PORT}`);
    console.log(`WebRTC Audio Signaling: ACTIVE on ws://localhost:${env.PORT}`);
    console.log(`Health check: http://localhost:${env.PORT}/api/health`);
    console.log(`===============================================`);
  });

  const handleShutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Gracefully shutting down...`);
    ReminderScheduler.stop();
    CloudflareTunnelService.stopTunnel();
    server.close(async () => {
      console.log('HTTP server closed.');
      await disconnectDatabase();
      console.log('Database connection closed.');
      process.exit(0);
    });

    // Force exit after 10s if graceful shutdown hangs
    setTimeout(() => {
      console.error('Forcefully terminating server.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
};

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
