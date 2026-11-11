# Canon Studio

> **A full-stack AI-powered fiction platform where non-writers generate stories, writers publish serialized sagas with AI continuity checking, and readers discover and rate them.**

---

## Features

### Tab 1 — Write a Story (No Login Required)
Guided 7-step wizard for non-writers:
- Free-text keyword seed → Genre → World tone → Language (English / Hinglish / Hindi)
- **Steps 4–6: Dynamic AI questions** generated from prior answers — 6 contextually crafted options each
- Full story generated and streamed (simulated) at 400 / 800 / 1,400 words
- Copy, Download, Write Another Version, **Play as Choose-Your-Path**, **Save to Writer Mode**

### Tab 2 — Choose Your Path (No Login Required)
Interactive branching narrative:
- Setup: idea, genre, language, decisions before ending (3 / 5 / 8)
- Each scene: 110–170 words + 3 choices (bold / careful / unexpected) + free-text custom action
- **Live narrative tree** — amber current node, blue active path, diamond endings; click any node to branch differently
- Explored choices are marked; Copy and Download full path

### Tab 3 — Writer Mode (Login Required)
Professional serialized fiction workspace:
- Private drafts: title, genre, blurb, ordered episodes
- **Draft with AI** — describe the episode, AI writes it respecting all canon facts and character voices
- **Check Against Canon** — sends episode + prior-episode facts to AI, returns:
  - `facts`: lasting world facts with quote & episode tag (removable)
  - `conflicts`: real contradictions with 1-click Apply Fix buttons
  - `voice`: out-of-character dialogue with 1-click "Use this rewrite"
  - `voiceNotes`: character speaking style fingerprints
- Save with fresh check updates canon memory; save without warns the author
- Delete story / delete episode both require a 2nd confirmation click
- Publish to Books / Update Published / Unpublish

### Tab 4 — Books (Reading Library)
- Browse: search (title, blurb, author), genre filter, min-rating filter, sort (newest / liked / rated / episodes)
- **Best Books Top 20** using the Bayesian formula:
  ```
  score = weighted_rating + 0.5 × log10(1 + likes)
  weighted_rating = (n × avg + 3 × globalMean) / (n + 3)
  ```
  Formula is explained on screen.
- Reader modal: episode pagination, like toggle, 1–5 star rating (one per user, changeable)
- Authors cannot like or rate their own stories (enforced server-side)

---

## Design System

| Token | Dark Mode | Light Mode |
|-------|-----------|-----------|
| Background | `#0F1220` | `#FAF6EC` |
| Card | `#1B1F36` | `#FFFFFF` |
| Raised | `#232845` | `#F0EAD8` |
| Text | `#F4EEDC` | `#1B1F36` |
| Muted | `#9AA0BC` | `#5E6482` |
| Accent (amber) | `#F2B84B` | `#D89112` |

- **Fonts**: Fraunces (headings & story text) + Inter (UI chrome)
- Dark-first; toggleable manually; persists to `localStorage`
- Min 44px touch targets; visible focus outlines; 400px mobile-safe

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19 + TypeScript + Tailwind CSS + Vite |
| Backend | Node.js + Express + TypeScript |
| AI Engine | Google Gemini API (flash-lite) with deterministic fallbacks |
| Storage | JSON file DB (`backend/data/db.json`) — zero infra |
| Auth | HttpOnly SameSite session cookie; salted PBKDF2-SHA512 password hashes |

---

## Getting Started

### Prerequisites
- Node.js 20.19+ or 22.12+
- A [Google AI Studio](https://aistudio.google.com) Gemini API key (optional — works fully with smart fallbacks)

### 1. Clone & Install

```bash
git clone https://github.com/anand05-cell/Canon-Studio.git
cd Canon-Studio

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Backend

```bash
cd backend
cp .env.example .env
# Add an AI provider key if you want live AI generation (optional).
# For production, set AUTH_SECRET to at least 32 random bytes.
# Example: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### 3. Run Development

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# → http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# → http://localhost:5173
```

### 4. Demo Accounts (Development Only)

| Name | Email | Password |
|------|-------|----------|
| Anya Sharma | anya@canonstory.studio | anya123 |
| Devraj Sen | dev@canonstory.studio | dev123 |

> Demo accounts are available only when `NODE_ENV` is not `production`. Production starts with an empty database and requires `AUTH_SECRET`.

### Production Security

- Set `NODE_ENV=production`, a random `AUTH_SECRET` of at least 32 bytes, and `FRONTEND_URL` to the exact HTTPS frontend origin.
- The backend binds to `127.0.0.1` by default. Set `HOST=0.0.0.0` only when a container or trusted reverse proxy requires it; terminate HTTPS at the proxy. Set `TRUST_PROXY_HOPS` only when the backend is reachable exclusively through that proxy, using the exact proxy hop count.
- The backend returns auth in an HttpOnly, Secure, SameSite=Strict cookie in production. The frontend and API should share an origin or be configured with explicit allowed origins.
- Passwords for new accounts must be 15–128 characters. Auth and API rate limits are in-memory and apply to one backend process; multiple production instances need a shared rate-limit store.
- Use a durable database, encrypted backups, and secret storage for a public production deployment. Do not commit `.env` or provider keys. The production security headers in Vite preview must also be configured on the static hosting/CDN if you deploy `frontend/dist` elsewhere.

---

## API Endpoints

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/health` | GET | — | Server & Gemini status |
| `/api/auth/register` | POST | — | Create account |
| `/api/auth/login` | POST | — | Sign in |
| `/api/auth/me` | GET | Bearer | Current user |
| `/api/wizard/next-question` | POST | — | AI wizard step question |
| `/api/wizard/generate-story` | POST | — | Full story generation |
| `/api/branching/start` | POST | — | Start branching story |
| `/api/branching/next` | POST | — | Next scene from choice |
| `/api/drafts` | GET/POST | Bearer | List / create drafts |
| `/api/drafts/:id` | GET/PUT/DELETE | Bearer (owner) | Draft CRUD |
| `/api/drafts/:id/ai-draft` | POST | Bearer (owner) | AI episode draft |
| `/api/drafts/:id/check-canon` | POST | Bearer (owner) | Full continuity audit |
| `/api/drafts/:id/publish` | POST | Bearer (owner) | Publish to Books |
| `/api/drafts/:id/unpublish` | POST | Bearer (owner) | Remove from Books |
| `/api/books` | GET | Optional | Browse library |
| `/api/books/best` | GET | Optional | Top 20 Bayesian ranked |
| `/api/books/:id/like` | POST | Bearer | Toggle like |
| `/api/books/:id/rate` | POST | Bearer | Rate 1–5 |

---

## AI Rules

- Every structured JSON call returns validated JSON with deterministic fallback engines
- Stories in Hinglish use Roman script only (never Devanagari)
- Prompts are sliced under ~50,000 characters to prevent oversize calls
- Error states: permission denied, rate limit, invalid output, cancelled — all show plain-language messages with Retry buttons, never infinite retry loops

---

## Project Structure

```
Story-Ai/
├── backend/
│   ├── src/
│   │   ├── routes/        # auth, wizard, branching, drafts, books, audit, voice, story, tree
│   │   ├── services/      # geminiService, wizardService, branchingService, canonChecker, storage
│   │   ├── types/         # canonStudio.ts (shared types)
│   │   ├── data/          # defaultStoryBible.ts (pre-seeded Neon Eclipse universe)
│   │   └── server.ts      # Express app
│   ├── data/              # db.json (created on first run)
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── AuthModal.tsx
│   │   │   ├── TabWriteStory.tsx   # 7-step AI Wizard
│   │   │   ├── TabChoosePath.tsx   # Branching story with live tree
│   │   │   ├── TabWriterMode.tsx   # Private drafts + canon audit
│   │   │   └── TabBooks.tsx        # Library + Best Books + Reader
│   │   ├── api.ts         # Typed API client
│   │   ├── types.ts       # Shared TypeScript interfaces
│   │   ├── App.tsx        # Root SPA + cross-tab state flows
│   │   └── index.css      # CSS variables (dark/light tokens)
│   └── tailwind.config.js
│
└── docs/
    └── API_CONTRACT.md
```

---

*Built with Gemini API + React + Express. No database required.*
