# LawFirmAI — AI-Powered Legal Practice Management

> **AI-powered case management, legal research, and document drafting for Indian lawyers.**

![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=flat&logo=mongodb&logoColor=white)
![LangChain](https://img.shields.io/badge/LangChain-121212?style=flat&logo=chainlink&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)

---

## About LawFirmAI

**LawFirmAI** ([lawfirmai.in](https://lawfirmai.in)) is an AI-native legal technology platform built specifically for Indian legal professionals. Our mission is to give every lawyer — solo practitioner or large firm — access to the same AI capabilities that were previously only available to the best-resourced practices.

We believe the future of legal work is not replacing lawyers with AI, but giving lawyers AI tools so powerful that one lawyer can do the work of ten.

---

## The Problem

Indian lawyers today juggle:

- **Fragmented tools** — separate apps for case notes, document storage, billing, research, and communication
- **Manual research** — hours spent on Indian Kanoon with no AI to surface relevant precedents
- **No document intelligence** — uploaded files sit in storage; no way to ask questions about them
- **Slow drafting** — starting every notice, petition, or contract from a blank page
- **No collaboration layer** — WhatsApp for client chat, email for documents, spreadsheets for billing

The result: billable hours lost to administrative overhead, missed precedents, and coordination friction.

---

## What We Provide

### AI Case Assistant
Upload your case documents (FIRs, contracts, affidavits, judgments) and ask questions in plain language. The AI answers with direct citations from your documents — powered by RAG (Retrieval-Augmented Generation).

### Automated Legal Research
Integrated Indian Kanoon search with AI-powered precedent matching. The AI reads your case documents and automatically surfaces relevant judgments — without you having to know the right keywords.

### Multi-Agent Investigation Engine
A 10-step AI investigation pipeline that reads all case documents and produces: entity extraction, fact compilation, timeline reconstruction, conflict detection, and a structured final report — in minutes instead of days.

### AI Legal Drafting
Conversational document drafting — describe what you need and the AI builds it with you. Full version history so you never lose a draft. Export to any format.

### End-to-End Case Management
From client intake to case closure: documents, team, activity logs, billing, calendar, and all communications in one place. Status tracking, role-based access, and full audit trails.

### Real-Time Team Collaboration
Built-in messaging for your team and clients. Case-level chat keeps case discussions separate from direct messages. Real-time updates via WebSocket.

### Organization Management
Firm-level workspace with seat-based licensing. Add team members with defined roles (Owner, Admin, Member, Client). Invite clients for limited case visibility.

### Subscription Billing
Razorpay-integrated subscription management. Seat-based plans, invoice history, payment tracking — all within the platform.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Node.js Backend | Express.js, Mongoose, Socket.io, JWT, Razorpay |
| AI Backend | FastAPI, LangChain, LangGraph |
| Databases | MongoDB, Qdrant (vectors), Neo4j (graph) |
| Real-time | Socket.io WebSockets |
| Auth | JWT (RS256), OTP email verification |
| Payments | Razorpay |

---

## Screenshots

**Dashboard — active cases, activity feed, quick actions**

![Dashboard](screenshots/07-portal-dashboard.png)

**Case Management — search, filter, status badges**

![Cases](screenshots/08-portal-cases.png)

**Case Law Research — Indian Kanoon integrated search**

![Case Law](screenshots/14-portal-case-law.png)

**Calendar — hearings, deadlines, event management**

![Calendar](screenshots/10-portal-calendar.png)

---

## Repository Structure

```
CheckOne/
├── Firm-Connect/          # Main application (React + Node.js + Python/FastAPI)
│   ├── LawFirmConnectweb/ # Frontend (React) + Node backend
│   ├── routes/            # FastAPI AI routes (chat, documents, drafts, investigation)
│   ├── rag/               # RAG pipeline
│   ├── ingestion/         # Document parsing + vector indexing
│   └── investigation/     # LangGraph multi-agent workflow
├── Admin-Dashboard/       # Super admin dashboard (React + Node.js)
├── outreach/              # Marketing materials
├── screenshots/           # UI reference screenshots
├── DEVELOPER.md           # Full technical documentation
└── USER_GUIDE.md          # End-user documentation
```

---

## Quick Links

- **[DEVELOPER.md](DEVELOPER.md)** — Architecture, API reference, environment setup, design system
- **[USER_GUIDE.md](USER_GUIDE.md)** — Feature walkthroughs for end users

---

## Contact

- **Website:** [lawfirmai.in](https://lawfirmai.in)
- **GitHub:** [@harshmohite04](https://github.com/harshmohite04)

---

*Built for Indian legal professionals.*
