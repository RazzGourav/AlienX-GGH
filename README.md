# 🇮🇳 ResQBharat: AI Emergency Intelligence & Response System

> **"Civilian-to-Command" Multi-Agent Emergency Intelligence Layer for India**

ResQBharat is an AI-assisted emergency intelligence layer designed for mass casualty events, natural disasters (monsoon floods, cyclones, urban fires, building collapses), and daily emergency coordination in India. It transforms fragmented, multilingual incident reports (Hindi, English, Hinglish, voice transcripts, photo/video evidence) into a unified, reviewable incident record for emergency dispatchers, complete with deterministic resource suggestions and human-in-the-loop verification.

---

## 🚀 Mission & Key Differentiators

In high-stress disaster situations, legacy emergency response lines (like ERSS-112) can become overwhelmed. ResQBharat provides a **Simulation-First, Glass-Box AI** platform:

1. **Multimodal & Multilingual Ingestion:** Ingests unstructured voice notes, text messages in Hindi/English/Hinglish, and drone/surveillance video feeds.
2. **Glass Box AI & Reasoning Trace:** Unlike black-box models, ResQBharat visualizes each agent's internal deduction chain (`reasoning_trace`) and generates cryptographic `thought_signature` tokens for an immutable chain of custody.
3. **Deterministic Rules & Protocol Zero Safeguard:** Critical life-saving decisions (e.g. hazardous material lockdowns, heavy asset deployments) require explicit human operator confirmation.
4. **Responder Tactical View:** Mobile-first interface for field responders to view live dispatch queues and update incident status in real time.

---

## 🏗️ Hierarchical Multi-Agent Architecture

ResQBharat employs a **Hierarchical Multi-Agent Orchestration Pattern** powered by Google Gemini (Gemini 3 Pro & Flash):

| Agent | Role | Model | Capabilities |
| :--- | :--- | :--- | :--- |
| **The Coordinator** | The Traffic Cop | `gemini-3-flash` | Routes raw multimodal inputs (Text, Audio, Video) to specialized agents with low latency. |
| **The Triage Agent** | The Specialist | `gemini-3-pro` | Evaluates medical and physical urgency, processes Hindi/English dialects, flags electrocution/structural hazards. |
| **The Surveillance Agent** | The Eye | `gemini-3-pro` | Analyzes drone video and photo evidence using frame sampling to assess structural damage and flood levels. |
| **The Logistics Agent** | The Hands | `gemini-3-pro` | Matches emergency needs against available resources (NDRF teams, fire brigades, boats, ambulances) with rule checks. |
| **The Reporter Agent** | The Chronicler | `gemini-3-flash` | Compiles official handover briefs, incident timelines, and geographic impact summaries. |

---

## 🛠️ Tech Stack

* **Framework:** Next.js 16 (App Router)
* **Language:** TypeScript / JavaScript
* **AI Engine:** Google Gemini (`@google/genai`, targeting Gemini 3 Pro & Flash with Deep Thinking)
* **Styling:** Tailwind CSS + Shadcn/UI (**Theme:** Agentic Tactical Dark Mode)
* **Maps:** React-Leaflet / Google Maps
* **State Management:** Zustand (Deterministic Simulation Clock & Cross-Tab Sync)
* **Video Forensics:** ffmpeg-static (Frame extraction for surveillance verification)

---

## 📂 Project Structure

```bash
/src
  /agents         # Specialized AI agents (Coordinator, Triage, Surveillance, Logistics, Reporter)
  /app            # Next.js App Router (Dashboard, Responder view, Streaming API)
  /components     # Tactical UI (TacticalMap, ReasoningLog, SignalFeed, CommanderControls)
  /hooks          # useDisasterSimulation (Simulation playback engine)
  /lib            # Gemini client, Zustand store, types, and utility functions
  /seed           # seed_data.json (Emergency simulation scenarios)
```

---

## 🚦 Getting Started

### 1. Prerequisites
- Node.js 18+
- npm or pnpm
- A Google Gemini API Key

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/iamdanishm/resqbharat.git
cd "ResQ Bharat"

# Install dependencies
npm install
```

### 3. Environment Setup
Copy the example environment configuration:
```bash
cp .env.example .env.local
```
Then configure your API key in `.env.local`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Run the Development Server
```bash
npm run dev
```

- **Command Center:** [http://localhost:3000](http://localhost:3000)
- **Responder Field View:** [http://localhost:3000/responder](http://localhost:3000/responder)

---

## 🛡️ Core Operating Principles

1. **Deterministic Simulation:** Reproducible high-stress scenarios without flaky external API dependencies during live demonstrations.
2. **Visible Reasoning:** Every agentic conclusion streams its live `reasoning_trace` to `<ReasoningLog />`.
3. **Chain of Custody:** Cryptographically signed thought signatures ensure auditability and accountability.
4. **Human-in-the-Loop Handover:** Automated triage proposes actions; human dispatchers retain final authorization on escalated protocols.

---

**ResQBharat — Protecting Communities Through Autonomous AI Intelligence** 🇮🇳
