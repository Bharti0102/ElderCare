import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import { env } from '../../config/env';

export interface TunnelStatus {
  active: boolean;
  url: string | null;
  startedAt: Date | null;
  error: string | null;
  binaryPath: string | null;
}

export class CloudflareTunnelService {
  private static process: ChildProcess | null = null;
  private static activeUrl: string | null = null;
  private static startedAt: Date | null = null;
  private static lastError: string | null = null;
  private static isStarting: boolean = false;

  /**
   * Discovers the cloudflared executable on the system.
   */
  public static findCloudflaredBinary(): string | null {
    // 1. Standard Program Files installation path
    const candidatePaths = [
      'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe',
      'C:\\Program Files\\cloudflared\\cloudflared.exe',
      path.join(process.env.LOCALAPPDATA || '', 'cloudflared', 'cloudflared.exe'),
      path.join(process.env.USERPROFILE || '', 'bin', 'cloudflared.exe'),
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    // 2. Default to PATH if available
    return 'cloudflared';
  }

  /**
   * Starts a Cloudflare Quick Tunnel forwarding to the local frontend/backend.
   * By default forwards to port 5173 (which proxies /api and /socket.io to backend 5000).
   */
  public static async startTunnel(targetPort: number = 5173): Promise<string> {
    if (this.activeUrl && this.process) {
      return this.activeUrl;
    }

    if (this.isStarting) {
      // Wait for existing start attempt
      return new Promise((resolve, reject) => {
        const interval = setInterval(() => {
          if (this.activeUrl) {
            clearInterval(interval);
            resolve(this.activeUrl);
          } else if (!this.isStarting) {
            clearInterval(interval);
            reject(new Error(this.lastError || 'Failed to start tunnel'));
          }
        }, 500);
      });
    }

    this.isStarting = true;
    this.lastError = null;

    const binary = this.findCloudflaredBinary();
    if (!binary) {
      this.isStarting = false;
      this.lastError = 'cloudflared binary not found on system.';
      throw new Error(this.lastError);
    }

    return new Promise<string>((resolve, reject) => {
      const targetUrl = `http://localhost:${targetPort}`;
      console.log(`[CloudflareTunnel] Starting quick tunnel targeting ${targetUrl} using ${binary}...`);

      const child = spawn(binary, ['tunnel', '--url', targetUrl], {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      this.process = child;
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          this.isStarting = false;
          this.lastError = 'Tunnel connection timed out after 30 seconds.';
          reject(new Error(this.lastError));
        }
      }, 30000);

      const handleOutput = (chunk: Buffer) => {
        const text = chunk.toString();
        // Look for *.trycloudflare.com
        const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
        if (match && !resolved) {
          resolved = true;
          clearTimeout(timeout);
          this.activeUrl = match[0];
          this.startedAt = new Date();
          this.isStarting = false;
          console.log(`[CloudflareTunnel] ✅ Tunnel established! Live Public URL: ${this.activeUrl}`);
          resolve(this.activeUrl);
        }
      };

      child.stdout?.on('data', handleOutput);
      child.stderr?.on('data', handleOutput);

      child.on('error', (err) => {
        console.error('[CloudflareTunnel] Process error:', err.message);
        this.lastError = err.message;
        this.isStarting = false;
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          reject(err);
        }
      });

      child.on('exit', (code, signal) => {
        console.log(`[CloudflareTunnel] Process exited (code: ${code}, signal: ${signal})`);
        this.process = null;
        this.activeUrl = null;
        this.startedAt = null;
        this.isStarting = false;
      });
    });
  }

  /**
   * Stops the active tunnel process.
   */
  public static stopTunnel(): void {
    if (this.process) {
      console.log('[CloudflareTunnel] Terminating tunnel process...');
      try {
        this.process.kill();
      } catch (err) {
        // Ignore kill errors
      }
      this.process = null;
    }
    this.activeUrl = null;
    this.startedAt = null;
    this.isStarting = false;
  }

  /**
   * Returns the current active public HTTPS URL if running, or configured env fallback.
   */
  public static getTunnelUrl(): string | null {
    return this.activeUrl || (env.CLOUDFLARE_TUNNEL_URL && env.CLOUDFLARE_TUNNEL_URL.trim().length > 0 ? env.CLOUDFLARE_TUNNEL_URL.trim() : null);
  }

  /**
   * Returns current status information.
   */
  public static getStatus(): TunnelStatus {
    const configuredUrl = env.CLOUDFLARE_TUNNEL_URL && env.CLOUDFLARE_TUNNEL_URL.trim().length > 0 ? env.CLOUDFLARE_TUNNEL_URL.trim() : null;
    const effectiveUrl = this.activeUrl || configuredUrl;

    return {
      active: !!this.activeUrl || !!configuredUrl,
      url: effectiveUrl,
      startedAt: this.startedAt,
      error: this.lastError,
      binaryPath: this.findCloudflaredBinary(),
    };
  }
}
