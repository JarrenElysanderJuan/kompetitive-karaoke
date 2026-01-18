---
description: How to run the backend and frontend builds
---

# Running Kompetitive Karaoke

You need to run both the backend and frontend servers simultaneously.

## 1. Backend Server

Open a terminal and run:

```powershell
cd d:\KompetitiveKaraoke\backend
# Development mode (auto-restarts on changes)
npm run dev

# OR Production mode (requires build first)
# npm run start
```

## 2. Frontend Client

Open a **separate** terminal and run:

```powershell
cd d:\KompetitiveKaraoke\kompetitive-karaoke
# Development mode
npm run dev

# OR Production Preview (requires build first)
# npm run preview
```

## Accessing the App

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000 (WebSocket)
- **Room Code**: Share the 6-character code with other players to join the same lobby.
