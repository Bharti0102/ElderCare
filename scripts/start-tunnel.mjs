#!/usr/bin/env node
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('\n===============================================================');
console.log('   🌐 ELDERCARE AI — CLOUDFLARE PUBLIC HTTPS TUNNEL LAUNCHER   ');
console.log('===============================================================\n');

function findCloudflared() {
  const candidatePaths = [
    'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe',
    'C:\\Program Files\\cloudflared\\cloudflared.exe',
    path.join(process.env.LOCALAPPDATA || '', 'cloudflared', 'cloudflared.exe'),
    path.join(process.env.USERPROFILE || '', 'bin', 'cloudflared.exe'),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) return p;
  }
  return 'cloudflared';
}

const binary = findCloudflared();
const targetUrl = process.env.TUNNEL_TARGET || 'http://localhost:5173';

console.log(`[1/3] Using cloudflared binary: ${binary}`);
console.log(`[2/3] Forwarding to local target: ${targetUrl}`);
console.log(`[3/3] Requesting quick HTTPS tunnel on trycloudflare.com...\n`);

const child = spawn(binary, ['tunnel', '--url', targetUrl], {
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
});

let tunnelUrl = null;

const handleOutput = (data) => {
  const text = data.toString();
  const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
  if (match && !tunnelUrl) {
    tunnelUrl = match[0];
    console.log('\n🎉 CLOUDFLARE PUBLIC HTTPS TUNNEL IS READY!');
    console.log('===============================================================');
    console.log(`📡 Public Domain:      ${tunnelUrl}`);
    console.log(`📲 Mobile Call Join:    ${tunnelUrl}/call/join/:callId`);
    console.log(`💻 Local Service:       ${targetUrl}`);
    console.log('===============================================================');
    console.log('\n👉 Fast2SMS messages to +91 numbers will now include this link.');
    console.log('👉 When opened on any smartphone, 2-way WebRTC audio works over HTTPS.');
    console.log('👉 Press Ctrl+C at any time to close the tunnel.\n');
  }
};

child.stdout.on('data', handleOutput);
child.stderr.on('data', handleOutput);

child.on('error', (err) => {
  console.error('\n❌ Failed to start cloudflared:', err.message);
  process.exit(1);
});

child.on('exit', (code, sig) => {
  console.log(`\nTunnel closed (exit code: ${code}, signal: ${sig})`);
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nShutting down Cloudflare Tunnel...');
  child.kill();
  process.exit(0);
});
