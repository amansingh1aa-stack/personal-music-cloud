# Personal Music Cloud

Personal Music Cloud is a self-hosted Spotify-style platform built for one person, but structured like a serious product repo. It ships with:

- a Next.js 15 web ERP dashboard for library operations and desktop playback
- a Fastify + Prisma API backed by SQLite for portability
- an Expo-based Android app for mobile listening and remote import control
- local filesystem music storage under `/music`
- YouTube playlist importing through `yt-dlp`
- LRCLIB-powered lyrics matching
- simple master-password authentication for private use

This repository is designed to be cloned, customized, and uploaded directly to GitHub as a polished starter project.

## Monorepo Layout

```text
.
+-- apps
¦   +-- api         Fastify API + Prisma + SQLite
¦   +-- mobile      Expo Android app
¦   +-- web         Next.js ERP dashboard + player
+-- packages
¦   +-- shared      Shared TypeScript types and helpers
+-- music           Local music library mount
+-- .github         GitHub workflow scaffold
+-- docker-compose.yml
+-- .env.example
```

## Features

### Web ERP dashboard

- library overview metrics
- YouTube import operations panel
- playlist management and drag-and-drop ordering
- immersive desktop player
- lyrics matching and persistence

### Android app

- secure token storage with Expo Secure Store
- mobile playback from the same self-hosted API
- import submission from your phone
- shared login model with the web dashboard

### Backend

- SQLite database via Prisma
- local file serving for music and cover art
- YouTube playlist extraction with `yt-dlp-wrap`
- import job tracking
- lyrics search through LRCLIB

## Tech Stack

- Frontend web: Next.js 15, Tailwind CSS, Lucide React
- Mobile: Expo, React Native, Expo Router, Expo AV
- Backend: Fastify, Prisma ORM, SQLite
- Storage: local filesystem `/music`
- Auth: master password + JWT

## Quick Start

### 1. Clone

```bash
git clone <your-repo-url>
cd personal-music-cloud
```

### 2. Create environment file

```bash
cp .env.example .env
```

Update at least these values:

- `MASTER_PASSWORD`
- `JWT_SECRET`
- `NEXT_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_API_BASE_URL`

For Android testing, `EXPO_PUBLIC_API_BASE_URL` should point to your computer's LAN IP, not `localhost`.

### 3. Install dependencies

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
```

### 4. Install external media tools

The importer requires:

- `ffmpeg`
- `yt-dlp`

Example:

```bash
pip install yt-dlp
```

Install `ffmpeg` with your OS package manager or from the official binaries.

### 5. Run the apps

API:

```bash
npm run dev:api
```

Web dashboard:

```bash
npm run dev:web
```

Android app:

```bash
npm run dev:mobile
```

## Docker

The repository includes a root [docker-compose.yml](./docker-compose.yml) for the API and web stack.

```bash
docker compose up --build
```

Services:

- web: [http://localhost:3000](http://localhost:3000)
- api: [http://localhost:4000](http://localhost:4000)

The Android app is not containerized; it connects to the API over your local network.

## Testing The Project

### Web test

1. Start API and web
2. Open [http://localhost:3000](http://localhost:3000)
3. Log in with `MASTER_PASSWORD`
4. Create a playlist
5. Import a YouTube playlist
6. Play tracks and reorder them
7. Run lyrics matching

### Android test

1. Set `EXPO_PUBLIC_API_BASE_URL` to your computer's LAN IP, for example `http://192.168.1.20:4000`
2. Start the API with `npm run dev:api`
3. Start Expo with `npm run dev:mobile`
4. Open the app in an Android emulator or Expo Go on your phone
5. Log in and confirm playback/import controls work

## GitHub Upload Checklist

Before pushing to GitHub:

1. Make sure `.env` is not committed
2. Keep `.env.example` committed
3. Keep `music/.gitkeep` committed so the folder exists after clone
4. Optionally rename the Android package in `apps/mobile/app.json`
5. Add screenshots after your first successful run for a stronger GitHub README

Basic publish flow:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

## Important Notes

- This project is intentionally optimized for personal use, not multi-user SaaS.
- Some YouTube playlists may require cookies for reliable importing.
- SQLite is ideal for portability; for very large libraries you may later move to Postgres.
- Android playback quality depends on the device being able to reach your API host.

## Next Improvements

- offline downloads in the Android app
- waveform view and queue history
- manual file uploads in the ERP dashboard
- richer metadata extraction from ID3 tags
- background polling for long-running imports