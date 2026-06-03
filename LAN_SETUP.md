# Krimson Trading Platform - LAN Setup Guide

This guide explains how to set up the Krimson Trading Platform to run the server and client on **different machines** on the same LAN (Local Area Network).

## Requirements

- 2+ computers on the same network (WiFi or Ethernet)
- Node.js 18+ installed on both machines
- Network firewall allowing traffic on ports 3001 (backend) and 5173 (frontend)

## Network Setup

### Step 1: Find Your Server IP Address

On the **server machine** (where the backend will run):

**Windows:**
```cmd
ipconfig
```
Look for "IPv4 Address" under your active network adapter.

**macOS/Linux:**
```bash
ifconfig
# or
ip addr show
```
Look for "inet" under your active interface (e.g., wlan0, eth0).

Example output:
```
IPv4 Address: 192.168.1.100
```

This IP address (e.g., `192.168.1.100`) is what clients will use to connect.

### Step 2: Configure the Backend Server

On the **server machine**:

1. Edit `backend/.env`:

```env
# Server Configuration
SERVER_HOST="0.0.0.0"        # Accept connections from any IP
PORT="3001"                  # Backend port

# CORS - IMPORTANT: Add your client machine's IP
# Example if client is at 192.168.1.101:
ALLOWED_ORIGINS="http://192.168.1.101:5173"

# Or allow all (less secure, only for testing):
ALLOWED_ORIGINS="*"

# Session timeout (30 minutes = 1800 seconds)
SESSION_TIMEOUT_SECONDS="1800"
```

2. Start the backend server:

```bash
cd backend
npm install
npm start
```

You should see:
```
Server running on http://0.0.0.0:3001
(Accessible from any network interface at http://<your-ip>:3001)
```

### Step 3: Configure the Frontend Client

On the **client machine**:

1. Edit `vite.config.js` to proxy to the server's IP:

```javascript
export default defineConfig({
  // ... other config
  server: {
    proxy: {
      '/api': {
        target: 'http://192.168.1.100:3001',  // <-- SERVER IP ADDRESS
        changeOrigin: true,
      },
      '/graphql': {
        target: 'http://192.168.1.100:3001',  // <-- SERVER IP ADDRESS
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://192.168.1.100:3001',    // <-- SERVER IP ADDRESS
        ws: true,
      },
    },
  },
})
```

2. Start the frontend development server:

```bash
npm install
npm run dev
```

3. Open the URL shown (usually `http://localhost:5173`) in your browser.

## Testing the Connection

### Quick Test

1. **Server**: Verify backend is running and accessible:
   ```bash
   curl http://localhost:3001/api/trades/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

2. **Client**: Test connection to server:
   ```bash
   curl http://192.168.1.100:3001/api/trades/health
   ```
   Should return the same response.

3. **Browser**: Open the client app and try to:
   - Register a new account
   - Login
   - View the trading dashboard

### Troubleshooting

#### "Connection refused" or "Network error"

1. **Check Windows Firewall** (on server):
   - Open "Windows Defender Firewall with Advanced Security"
   - Add inbound rule for port 3001
   - Or temporarily disable firewall for testing: `netsh advfirewall set allprofiles state off`

2. **Check IP addresses**:
   - Ensure both machines are on the same network
   - Verify the server IP hasn't changed (some networks use DHCP)

3. **Test connectivity**:
   ```bash
   ping 192.168.1.100  # From client machine
   ```

#### CORS errors in browser

1. Check `ALLOWED_ORIGINS` in server's `.env` includes the client URL
2. Example: `ALLOWED_ORIGINS="http://192.168.1.101:5173"`

#### Session timeout too quickly

Adjust `SESSION_TIMEOUT_SECONDS` in `backend/.env`. The frontend and backend use the same value.

## Security Notes for Lab Environment

### For Bronze Grade Requirements:

1. **Secure Login/Register**: ✅ Implemented with bcrypt password hashing
2. **Token-based Role/Permissions**: ✅ JWT tokens with role and permission claims
3. **Session Management with Inactivity Timeout**: ✅ 30-minute inactivity logout

### Recommended Security Settings

```env
# Use a strong, unique secret
AUTH_SECRET="your-random-secret-here-min-32-chars"

# Enable HTTPS for production (requires certificates)
USE_HTTPS="true"
SSL_CERT_PATH="./certs/cert.pem"
SSL_KEY_PATH="./certs/key.pem"

# Restrict CORS to known clients only
ALLOWED_ORIGINS="http://192.168.1.101:5173,http://192.168.1.102:5173"
```

## Multiple Clients

You can connect multiple client machines to the same server:

1. Each client uses the same server IP
2. Add each client IP to `ALLOWED_ORIGINS`:
   ```env
   ALLOWED_ORIGINS="http://192.168.1.101:5173,http://192.168.1.102:5173,http://192.168.1.103:5173"
   ```
3. Each client runs its own `npm run dev` on their machine

## Production Deployment

For a production LAN setup:

1. Build the frontend:
   ```bash
   npm run build
   ```

2. Serve the built files from the server using a static file server

3. Or deploy the backend to a dedicated server and configure nginx as a reverse proxy

## Quick Reference

| Setting | Location | Example Value |
|---------|----------|---------------|
| Server IP | `backend/.env` SERVER_HOST | `0.0.0.0` |
| Server Port | `backend/.env` PORT | `3001` |
| Client Origin | `backend/.env` ALLOWED_ORIGINS | `http://192.168.1.101:5173` |
| Session Timeout | `backend/.env` SESSION_TIMEOUT_SECONDS | `1800` |
| Server URL | `vite.config.js` proxy target | `http://192.168.1.100:3001` |

## Session Timeout Feature

The app implements **automatic logout on inactivity**:

- **Warning shown**: 2 minutes before logout
- **Logout after**: 30 minutes of no activity
- **Activity tracked**: Mouse movement, clicks, keyboard input, scrolling
- **Session extension**: Click "Stay Logged In" to reset the timer

This satisfies the requirement: "the user will be logged out in case of inactivity"
