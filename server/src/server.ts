import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { ReminderScheduler } from './services/reminder/reminder.scheduler';
import { CloudflareTunnelService } from './services/tunnel/cloudflare.tunnel';
import { CallingService } from './services/calling/calling.service';

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

  io.on('connection', (socket) => {
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
