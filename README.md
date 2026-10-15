# FlowForge AI

> **Intelligent Fullstack Workflow Automation & Multi-Provider AI Orchestration Platform**  
> Built with React 19, Node.js 24 LTS, Express, MongoDB Atlas, and React Flow.

[![Live Frontend](https://img.shields.io/badge/Frontend-Vercel-059669?style=flat-square&logo=vercel)](https://flowforge-ai-ten.vercel.app)
[![Live Backend](https://img.shields.io/badge/Backend-Render-E5B45B?style=flat-square&logo=render)](https://flowforge-ai-api-hj63.onrender.com/api/health)
[![Database](https://img.shields.io/badge/Database-MongoDB%20Atlas-151715?style=flat-square&logo=mongodb)](https://www.mongodb.com/atlas)
[![Node.js](https://img.shields.io/badge/Runtime-Node.js%2024%20LTS-252419?style=flat-square&logo=node.js)](https://nodejs.org)
[![React](https://img.shields.io/badge/Framework-React%2019-0B0D0C?style=flat-square&logo=react)](https://react.dev)

---

## 📌 Project Overview & Genuine Problem Statement

Modern engineering teams rely heavily on visual automation platforms for incident triage, alerts routing, and data ETL. However, typical workflow systems suffer from three critical architectural flaws:
1. **Fragile Single-Provider AI Couplings:** When a primary LLM provider deprecates a model ID (HTTP 404), encounters service outages (HTTP 503), or exhausts quota limits (HTTP 429), standard automation pipelines fail catastrophically with no automatic fallback.
2. **Opaque Runtime Telemetry:** Debugging multi-step pipelines is notoriously difficult when systems only report binary "Passed" or "Failed" states without millisecond-accurate step-by-step durations, input/output traces, or provider attempt telemetry.
3. **Security Vulnerabilities in Dynamic Evaluation:** Many automation tools rely on unsafe JavaScript `eval()` or `new Function()` to parse conditional expressions, exposing backends to remote code execution and prototype pollution attacks.

**FlowForge AI** solves these challenges by combining:
- A **deterministic DAG execution engine** (Kahn's topological sort algorithm) with cycle detection, branch reachability, and diamond DAG convergence.
- A **multi-provider AI failover cascade** (Google Gemini &rarr; Groq &rarr; OpenAI &rarr; Mistral AI) operating within a single monotonic timeout budget with exponential backoff and jitter.
- A **Visual Failover Cascade Viewer** providing transparent, step-by-step attempt observability, discrete status pills, and sanitized error diagnostics.
- A **safe condition evaluator** supporting 14 comparison operators with strict prototype pollution guards and zero `eval()`.
- **Defense-in-depth security** featuring private IP CIDR rejection, DNS rebinding protection, request redirect re-validation, and multi-tenant IDOR guards.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Client["Frontend Application (React 19 + Vite 8)"]
        Canvas["React Flow DAG Canvas (@xyflow/react)"]
        Inspector["Properties Inspector Panel"]
        Modal["Execution Result Modal"]
        Viewer["Visual Failover Cascade Viewer"]
        TelemetryDash["Execution Telemetry Dashboard"]
        Canvas <--> Inspector
        Canvas --> Modal
        Modal --> Viewer
        TelemetryDash --> Viewer
    end

    subgraph Server["Backend Server (Node.js 24 LTS + Express 4.21)"]
        CORS["Strict Origin CORS Validator"]
        RateLimit["Rate Limiting Middleware (Auth & Execution)"]
        AuthMiddleware["JWT Authentication & IDOR Verification"]
        Engine["Topological DAG Execution Engine"]
        Validator["Graph Validator (Kahn's Algorithm)"]
        CondEval["Safe Condition Evaluator (14 Operators)"]
        AIExec["Multi-Provider AI Executor"]
        HTTPExec["SSRF-Guarded HTTP Request Executor"]
        Scheduler["In-Memory Scheduler (node-cron)"]

        CORS --> RateLimit
        RateLimit --> AuthMiddleware
        AuthMiddleware --> Validator
        Validator --> Engine
        Engine --> CondEval
        Engine --> AIExec
        Engine --> HTTPExec
    end

    subgraph Database["Persistence (MongoDB Atlas)"]
        Atlas[("MongoDB Collections: Users, Workflows, Executions")]
        AuthMiddleware <--> Atlas
        Engine <--> Atlas
    end

    subgraph Providers["External Inference Gateways"]
        Gemini["Google Gemini (Primary)"]
        Groq["Groq gpt-oss-20b (Fallback 1)"]
        OpenAI["OpenAI gpt-4o-mini (Fallback 2)"]
        Mistral["Mistral AI (Fallback 3)"]

        AIExec -->|REST API| Gemini
        AIExec -->|OpenAI-Compatible| Groq
        AIExec -->|OpenAI-Compatible| OpenAI
        AIExec -->|OpenAI-Compatible| Mistral
    end
```

---

## 📁 Repository Structure & Monorepo Layout

FlowForge AI is organized as a clean decoupled fullstack application:

```text
flowforge-ai/
├── client/                     # Frontend SPA (React 19, Vite 8, Tailwind CSS)
│   ├── public/                 # Static assets, SVG icons, and favicons
│   ├── src/
│   │   ├── components/         # Shared UI, layouts, and workflow canvas components
│   │   │   ├── layout/         # Navbar, Footer, and responsive frame wrappers
│   │   │   └── workflow/       # React Flow canvas, node types, Inspector, Failover Viewer
│   │   ├── context/            # Authentication and global state providers
│   │   ├── data/               # Flagship blueprints and production template definitions
│   │   ├── pages/              # Landing page, Dashboard, Workflow Editor, Executions, Settings
│   │   └── utils/              # Client telemetry sanitization and formatting helpers
│   ├── .env.example            # Template for frontend environment configuration
│   ├── package.json            # Client dependencies and Vite scripts
│   └── vite.config.js          # Vite build config with manual chunks and React plugin
├── server/                     # Backend API (Node.js 24 ESM, Express, Mongoose)
│   ├── config/                 # MongoDB connection and environment bootstrapping
│   ├── controllers/            # Request handlers for auth, workflows, and executions
│   ├── middleware/             # JWT auth, IDOR validation, and per-route rate limiters
│   ├── models/                 # Mongoose schemas (User, Workflow, Execution)
│   ├── routes/                 # Express route definitions
│   ├── services/
│   │   └── workflow/           # DAG engine, Kahn's validator, AI executor, safe condition evaluator
│   ├── utils/                  # SSRF IP validator, DNS resolver, secret sanitizers
│   ├── .env.example            # Template for server environment variables
│   ├── package.json            # Server dependencies and lifecycle scripts
│   └── server.js               # Application entrypoint with graceful shutdown handling
├── docs/                       # Detailed engineering documentation
│   └── ARCHITECTURE.md         # Full system architecture and sequence diagrams
├── scratch/                    # Offline automated verification suites and test harnesses
└── README.md                   # Project overview, setup guide, and portfolio summary
```

---

## ✨ Core Engineering Features

### 1. Visual Directed Acyclic Graph (DAG) Canvas
- **React Flow Canvas (`@xyflow/react` 12):** Drag-and-drop workflow canvas with custom styled nodes, port snapping, contextual properties inspector, and edge connection validation.
- **6 Supported Node Types:**
  - **Webhook Trigger Node:** Ingests external HTTP events or manual JSON payloads.
  - **AI Processing Node:** Dispatches prompt templates to LLMs with upstream variable interpolation (`{{trigger.payload.service}}`) and structured JSON enforcement.
  - **Condition Node:** Evaluates incoming payload attributes and routes execution across dedicated `TRUE` and `FALSE` handles.
  - **Action Node:** Deterministic data passthrough, header injection, and payload reshaping.
  - **API Request Node:** Dispatches outbound HTTP/HTTPS requests with SSRF guards.
  - **Return Output Node:** Commits final pipeline state and aggregates upstream trace outputs.

### 2. Multi-Provider AI Failover Architecture
- **Cascade Priority:** Google Gemini &rarr; Groq (`openai/gpt-oss-20b`) &rarr; OpenAI (`gpt-4o-mini`) &rarr; Mistral AI (`mistral-small-latest`).
- **Explicit Opt-In:** Failover is configured per AI node via `enableFailover: true`. Standard workflows retain single-provider execution.
- **Monotonic Global Timeout Budget:** A single timeout deadline (default: 15,000 ms) governs all candidate attempts. Each attempt subtracts elapsed time; no attempt can overrun the remaining global budget.
- **Error Classification:**
  - *Cascadeable:* Upstream model deprecation (HTTP 404), rate limit exhaustion (HTTP 429), service unavailability (HTTP 502/503/504).
  - *Fatal (Halt Immediately):* Authentication failure (HTTP 401/403), malformed request (HTTP 400), content safety filter blocks.
- **Graceful Key Skipping:** If an optional fallback API key is omitted on the server, the provider is cleanly skipped without throwing an exception or failing the workflow.

#### 🛡️ AI Verification & Testing Disclosures (Honest Production Audit)
- **Live-Verified Provider:** Standalone inference for Groq (`openai/gpt-oss-20b`) has been verified against Groq's official API endpoint, confirming sub-second generation and structured JSON parsing.
- **Mock-Verified Failover Suite:** The full multi-provider failover cascade (Gemini 503 transient recovery &rarr; Groq, Gemini 404 model retirement &rarr; Groq, unconfigured key skipping, total cascade failure secret scrubbing, and 401 permanent error halts) has been verified via a 10/10 deterministic offline test suite (`scratch/test_gemini_to_groq_failover_final.mjs`) using guarded mock envelopes ($0 cost).
- **Gemini Status Disclosure:** Google Gemini has **not** been live-verified against live production endpoints to prevent billable charges and quota consumption; all Gemini tests utilize offline mocked JSON response envelopes.

### 3. Visual Failover Cascade Viewer
- **Polished Timeline Card:** Integrated directly into `ExecutionResultModal.jsx` and historical `Executions.jsx` trace drawers.
- **Discrete Operational Badges:** Visualizes `Success • Recovered` (Emerald), `Model Unavailable (HTTP 404)` (Gold/Ruby), `Skipped • Unconfigured Key` (Warmgray), `Rate Limit (HTTP 429)` (Gold), and `Auth Error` (Ruby).
- **Canvas Status Badges:** Updates node subtitles to display dynamic recovery paths (e.g. `gemini ➔ groq (openai/gpt-oss-20b)`) with a gold sparkle `Failover OK` runtime badge.
- **Zero Secret Leaks:** Scrubbing pipeline redacts Bearer tokens, query parameter API keys (`key=[REDACTED]`), and local file paths before rendering in diagnostic error callouts.

### 4. Deterministic Execution & Selective Branch Skipping
- **Kahn's Topological Sort:** Validates graph acyclicity prior to execution, detecting circular dependencies immediately.
- **Branch Reachability:** Deactivates unselected conditional branches. Nodes on inactive branches are marked `status: 'skipped'` (`0ms` duration), preventing wasted compute.
- **Diamond DAG Convergence:** Re-joining DAG paths execute shared downstream nodes **exactly once** when reachable via the active path.

### 5. Safe Condition Evaluator Service
- **14 Built-in Operators:** `equals`, `strict_equals`, `not_equals`, `greater_than`, `greater_than_or_equal`, `less_than`, `less_than_or_equal`, `contains`, `not_contains`, `starts_with`, `ends_with`, `is_empty`, `is_not_empty`, `is_true`, `is_false`.
- **Zero `eval()`:** No dynamic code evaluation or string-to-code execution.
- **Prototype Pollution Prevention:** Explicitly blocks traversal into `__proto__`, `constructor`, and `prototype`.
- **Safe Path Resolution:** Supports nested dot-notation (`structured.severity`) and bracket syntax (`items[0].id`).

### 6. Network Security & SSRF Defense-in-Depth
- **CIDR Address Blocks:** Rejects IPv4 private ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopback (`127.0.0.0/8`), and cloud metadata IP (`169.254.169.254`).
- **DNS Rebinding Protection:** Pre-resolves target hostnames via `dns.promises.lookup` to ensure domains do not resolve to internal network IPs.
- **Redirect Re-validation:** Validates target URLs upon every redirect hop (up to 5 redirects).
- **Stream Bounds:** Outbound request bodies capped at 32 KB; response bodies bounded at 512 KB to prevent memory exhaustion.

### 7. Trigger Subsystems: Webhooks & Scheduling
- **Token-Based Webhook Ingestion:** Ingests external payloads via `/api/workflows/webhook/:token` or `/api/webhooks/:token` with optional HMAC secret verification.
- **In-Memory Cron Scheduler:** Background scheduling via `node-cron` with overlap prevention, initializing active schedules on server boot.

---

## 🔬 Concise Workflow Execution Example & Visual Previews

### End-to-End Execution Trace Example: AI Incident Triage

Below is an illustrative execution trace example demonstrating the flagship **AI Incident Triage & Smart Recovery** pipeline running with simulated failover recovery:

#### 1. Inbound Webhook Payload (`Trigger Node`)
```json
{
  "service": "payment-gateway",
  "latencyP99Ms": 2450,
  "errorRatePercent": 14.8,
  "environment": "production",
  "activeConnections": 1820
}
```

#### 2. AI Reasoning & Failover Recovery (`AI Node`)
```text
Prompt Template:
"Evaluate incident payload for {{trigger.payload.service}}.
Latency: {{trigger.payload.latencyP99Ms}}ms, Error Rate: {{trigger.payload.errorRatePercent}}%.
Output JSON schema: { severity: 'high' | 'low', escalate: boolean, reason: string, recommendedAction: string }"

Attempt 1 [gemini / gemini-2.5-flash]: HTTP 503 Overloaded (42ms) -> Failover Initiated
Attempt 2 [groq / openai/gpt-oss-20b]: HTTP 200 OK (312ms) -> Recovered Successfully

Structured Output:
{
  "severity": "high",
  "escalate": true,
  "reason": "P99 latency of 2450ms exceeding 2000ms threshold with 14.8% error rate indicates severe downstream degradation.",
  "recommendedAction": "Route alert to P1 on-call engineer and enable payment circuit breaker."
}
```

#### 3. Deterministic Routing (`Condition Node`)
```text
Evaluation Rule: field 'structured.severity' equals 'high'
Result: TRUE (Duration: 1ms)
Routing Outcome:
  ├── 'true'  handle -> Urgent Ops Dispatcher [EXECUTED (1ms)]
  └── 'false' handle -> Routine Telemetry Logger [SKIPPED (0ms)]
```

#### 4. Committed Output Payload Example (`Output Node`)
```json
{
  "status": "succeeded",
  "workflowId": "670c56789abcdef012345678",
  "durationMs": 356,
  "failoverTriggered": true,
  "finalProvider": "groq",
  "finalModel": "openai/gpt-oss-20b",
  "triageDecision": {
    "severity": "high",
    "escalate": true,
    "dispatchedTo": "Urgent Ops Dispatcher",
    "archived": false
  }
}
```

#### 📸 Visual Previews & Live UI
- **Live Interactive Canvas:** Experience the full interactive DAG canvas, drag-and-drop nodes, and live simulator directly on the deployed app: **[https://flowforge-ai-ten.vercel.app](https://flowforge-ai-ten.vercel.app)**.
- **Repository Cleanliness Note:** To keep the git commit history lightweight and prevent repository bloat, binary screenshot files are not tracked in git; all visual components are rendered live in React.

---

## 🛠️ Technology Stack

| Layer | Technologies | Version / Notes |
| :--- | :--- | :--- |
| **Frontend Framework** | React | 19.2.8 (Vite 8.3 bundler) |
| **Workflow Canvas** | `@xyflow/react` | 12.12.0 (React Flow) |
| **Styling & Icons** | Tailwind CSS & Lucide React | Luxury palette: Obsidian Charcoal `#0B0D0C`, Champagne Gold `#E5B45B`, Emerald `#059669`, Ruby `#C83C3C`, Ivory `#F5F0E6` |
| **Routing & HTTP** | React Router & Axios | React Router 7.18, Axios 1.20 with JWT token interceptors |
| **Backend Runtime** | Node.js (ESM) | v24 LTS (native `fetch`, `AbortController`) |
| **Web Server** | Express | 4.21.2 |
| **Database & ODM** | MongoDB Atlas & Mongoose | Mongoose 8.9.5 |
| **Security & Auth** | bcryptjs & jsonwebtoken | JWT Bearer authentication, 10-round bcrypt salt |
| **Rate Limiting** | express-rate-limit | MemoryStore, per-route IP tracking with IPv6 subnet normalization |
| **Scheduling** | node-cron | 4.6.0 |

---

## 📋 Complete API Reference

### Authentication Endpoints (`/api/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public (Rate Limited) | Creates user account, returns JWT token |
| `POST` | `/api/auth/login` | Public (Rate Limited) | Authenticates credentials, returns JWT token |
| `GET` | `/api/auth/me` | Private (JWT) | Returns authenticated user profile |
| `PUT` | `/api/auth/profile` | Private (JWT) | Updates user profile (name, password) |

### Workflow Management Endpoints (`/api/workflows`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/workflows` | Private (JWT) | Creates new workflow document |
| `GET` | `/api/workflows` | Private (JWT) | Lists authenticated user's workflows |
| `GET` | `/api/workflows/:id` | Private (JWT) | Fetches workflow definition by ID (IDOR protected) |
| `PUT` | `/api/workflows/:id` | Private (JWT) | Updates workflow nodes and edges |
| `DELETE`| `/api/workflows/:id` | Private (JWT) | Deletes workflow document |
| `POST` | `/api/workflows/:id/duplicate` | Private (JWT) | Duplicates workflow as a new document with remapped IDs |
| `GET` | `/api/workflows/templates` | Private (JWT) | Lists available workflow blueprints and catalog templates |
| `POST` | `/api/workflows/from-template` | Private (JWT) | Instantiates a new workflow from a catalog blueprint |
| `GET` | `/api/workflows/:id/triggers` | Private (JWT) | Fetches schedule and webhook configurations |
| `PUT` | `/api/workflows/:id/schedule` | Private (JWT) | Updates workflow cron schedule |
| `PUT` | `/api/workflows/:id/webhook` | Private (JWT) | Generates/updates webhook token and HMAC secret |
| `POST` | `/api/workflows/:id/execute` | Private (Rate Limited) | Executes workflow synchronously and records trace |
| `GET` | `/api/workflows/:id/executions`| Private (JWT) | Lists run history for specific workflow |

### Webhook Ingestion Endpoints
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/workflows/webhook/:token` | Public (Rate Limited) | Ingests payload and triggers workflow execution |
| `POST` | `/api/webhooks/:token` | Public (Rate Limited) | Public alias for webhook ingestion |

### Execution Telemetry Endpoints (`/api/executions`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/executions` | Private (JWT) | Paginated list of user execution traces with status & trigger filter |
| `GET` | `/api/executions/stats` | Private (JWT) | Aggregated stats (total, succeeded, failed, success rate) |
| `GET` | `/api/executions/:id` | Private (JWT) | Detailed trace including node-level inputs, outputs, and failoverLog |
| `POST` | `/api/executions/:id/rerun` | Private (Rate Limited) | Reruns execution preserving original trigger payload and lineage |
| `DELETE`| `/api/executions/:id` | Private (JWT) | Deletes a single execution trace (owner-only) |
| `POST` | `/api/executions/purge-failed` | Private (JWT) | Purges all failed execution records for authenticated user |

### Health Probes (`/api/health`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Primary health & database connection probe (HTTP 503 if disconnected) |
| `GET` | `/api/health/liveness` | Public | Lightweight process liveness probe |
| `GET` | `/api/health/readiness`| Public | Database readiness probe |

---

## ⚙️ Environment Variables

### Backend (`server/.env`)
Use `server/.env.example` as a template:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Connection
MONGODB_URI=your_mongodb_connection_string_here

# Authentication Security
JWT_SECRET=your_secure_random_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# CORS Configuration (comma-separated allowed origins)
CLIENT_ORIGIN=http://localhost:5173,https://flowforge-ai-ten.vercel.app

# Rate Limiting
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=20
EXECUTION_RATE_LIMIT_WINDOW_MS=60000
EXECUTION_RATE_LIMIT_MAX=30

# AI Provider Credentials (Server-Side Only - Never Exposed to Client)
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
MISTRAL_API_KEY=your_mistral_api_key_here

# Default AI Model Settings
GEMINI_DEFAULT_MODEL=gemini-2.5-flash
GROQ_DEFAULT_MODEL=openai/gpt-oss-20b
OPENAI_DEFAULT_MODEL=gpt-4o-mini
MISTRAL_DEFAULT_MODEL=mistral-small-latest
```

### Frontend (`client/.env`)
Use `client/.env.example` as a template:

```env
# Public Backend API Base URL (inlined by Vite at build time)
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 🚀 Local Installation & Setup

### Prerequisites
- **Node.js**: `>= 20.0.0` (Node.js 24 LTS verified)
- **npm**: `>= 10.0.0`
- **MongoDB**: Active MongoDB Atlas cluster or local MongoDB instance

### Step 1: Clone Repository
```bash
git clone https://github.com/DivyanshuG23/flowforge-ai.git
cd flowforge-ai
```

### Step 2: Setup & Start Backend Server
```bash
cd server
npm install
cp .env.example .env
# Configure MONGODB_URI and JWT_SECRET in server/.env
npm run dev
```
*Backend API will start at:* `http://localhost:5000`  
*Verify health check:* `http://localhost:5000/api/health`

### Step 3: Setup & Start Frontend Client
```bash
# In a new terminal window:
cd client
npm install
cp .env.example .env
npm run dev
```
*Frontend will start at:* `http://localhost:5173`

---

## 📦 Monorepo Package Scripts

| Directory | Command | Description |
| :--- | :--- | :--- |
| `server/` | `npm start` | Runs production backend server (`node server.js`) |
| `server/` | `npm run dev` | Runs backend in development mode with `nodemon` |
| `server/` | `npm test` | Runs offline test readiness harness |
| `client/` | `npm run dev` | Starts Vite development server at `localhost:5173` |
| `client/` | `npm run build` | Compiles production assets into `client/dist/` |
| `client/` | `npm run preview`| Locally serves production build bundle |
| `client/` | `npm run lint` | Fast static code analysis via `oxlint` |

---

## 🧪 Automated Testing & Verification Suite

FlowForge AI includes an automated offline test harness covering security boundaries, graph execution semantics, multi-provider failover cascades, and data sanitization.

### Execution Commands
```bash
# Run the complete Gemini-to-Groq failover verification suite (10 offline scenarios):
node scratch/test_gemini_to_groq_failover_final.mjs

# Run mock failover pipeline verification (6 tests - Gemini 404 cascade, rate limits, fatal errors):
node scratch/smoke_test_failover_pipeline.mjs

# Run Groq production hardening test suite (11 tests - model parsing, JSON mode, headers):
node scratch/test_groq_production_hardening.mjs

# Run production readiness audit suite (10 tests - closures, SSRF filters, IPv6 limiter):
node scratch/test_final_readiness_audit.mjs

# Run visual failover cascade logic & sanitization suite:
node scratch/test_failover_viewer_logic.mjs

# Run documentation & Mermaid syntax validation suite:
node scratch/test_documentation_verification.mjs

# Run landing page copy & flagship blueprint DAG validation:
node scratch/test_landing_and_blueprint.mjs

# Run client production build verification:
cd client && npm run build
```

### Verified Test Results Summary
| Test Suite | Focus Area | Verified Scope | Result |
| :--- | :--- | :---: | :---: |
| `test_gemini_to_groq_failover_final.mjs` | Primary success, 503 recovery, 404 model retirement policy, missing keys, secret redaction | 10 Scenarios | **10 / 10 PASSED** |
| `test_groq_production_hardening.mjs` | Default model `openai/gpt-oss-20b`, JSON system injection, plain-text headers, sanitization | 11 Tests | **11 / 11 PASSED** |
| `test_final_readiness_audit.mjs` | Render purity, hook stale closures, SSRF CIDR rejection, IPv6 rate limiting | 10 Tests | **10 / 10 PASSED** |
| `smoke_test_failover_pipeline.mjs` | Multi-provider failover, Gemini 404 cascade to Groq, fatal 401/safety halts | 6 Tests | **6 / 6 PASSED** |
| `test_failover_viewer_logic.mjs` | Status badge mappings, Bearer token redaction, path stripping, legacy null checks | 8 Tests | **8 / 8 PASSED** |
| `test_documentation_verification.mjs` | Section completeness, Mermaid syntax, relative link integrity, secret placeholder check | 17 Checks | **17 / 17 PASSED** |
| `test_landing_and_blueprint.mjs` | Landing page copy accuracy, zero stale model references, blueprint DAG validity | 5 Tests | **5 / 5 PASSED** |
| `client: npm run build` | Vite 8.3 production bundling, CSS minification, syntax validation | 2,144 Modules | **BUILT IN 1.58s (0 Errors)** |

---

## 🎯 Flagship Interview Demo: AI Incident Triage & Smart Recovery

For a 2–3 minute technical interview walkthrough, demonstrate the **AI Incident Triage & Smart Recovery** blueprint:

1. **Topology:** `Webhook Alert Ingestion` &rarr; `AI Incident Triage` &rarr; `High Severity Branch` &rarr; `Urgent Ops Dispatcher` &rarr; `Incident Resolution Output`.
2. **Deterministic Routing:** When incoming error telemetry (`latencyP99Ms: 2450`, `errorRatePercent: 14.8`) is analyzed by the AI node, it outputs structured JSON `{ severity: "high", reason: "...", recommendedAction: "..." }`. The condition node evaluates `field: 'structured.severity' equals 'high'` &rarr; activates the urgent ops branch &rarr; marks the routine logger **Skipped**.
3. **Failover Resilience:** The AI node has `enableFailover: true`. If Gemini returns an upstream model retirement notice (HTTP 404) or overload (HTTP 503), the engine cascades sequentially to Groq (`openai/gpt-oss-20b`) within the monotonic timeout budget.
4. **Visual Observability:** Open the execution modal or trace drawer to show the **Visual Failover Cascade Viewer**, pointing out the candidate attempt timeline, duration in ms, discrete status pills, and sanitized diagnostic reasons.

*See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#6-flagship-demo-guide-ai-incident-triage--smart-recovery) for step-by-step interview talking points.*

---

## 🔒 Security Considerations & Honest Disclosures

1. **Live Fallback Credentials:** Multi-provider fallback execution requires server environment keys (e.g. `GROQ_API_KEY`). When optional fallback keys are absent, the executor cleanly skips unconfigured providers without crashing and reports the primary result in the cascade timeline.
2. **In-Memory Rate Limiting:** `express-rate-limit` tracks IP counters in Node.js process memory with IPv6 subnet normalization. For distributed multi-instance clusters, configure a shared Redis store via `rate-limit-redis`.
3. **In-Memory Scheduler:** Scheduled triggers (`node-cron`) run in-process. In horizontally scaled container environments, duplicate execution prevention requires a distributed lock (e.g., Redis Redlock) or dedicated task queue (e.g., BullMQ).
4. **JWT Storage:** Auth tokens are stored in browser `localStorage`. For environments requiring strict XSS immunity, migrating to `httpOnly`, `SameSite=Strict` cookies is recommended.

---

## 💼 Resume Project Description

```markdown
**FlowForge AI — Fullstack Visual Workflow Automation & AI Orchestration Platform**
*Node.js 24 LTS, Express, MongoDB Atlas, React 19, React Flow, Tailwind CSS, Google Gemini, Groq, OpenAI*
• Engineered a deterministic DAG execution engine featuring Kahn's topological sort algorithm, cycle detection, selective branch skipping, and diamond dependency convergence.
• Implemented a resilient 4-provider AI failover cascade (Google Gemini → Groq → OpenAI → Mistral AI) with a monotonic timeout budget, exponential backoff with jitter, and automatic key-skipping.
• Built an interactive React Flow canvas with custom nodes, contextual properties inspector, and a Visual Failover Cascade Viewer rendering millisecond-level step telemetry and scrubbed diagnostics.
• Fortified platform security with SSRF prevention (private CIDR blocks, DNS rebinding guards, redirect re-validation), prototype-pollution-free condition evaluation (14 operators), and multi-tenant IDOR defense.
```

---

## 📄 License & Documentation

- **Architecture Deep-Dive:** Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for module specifications, execution flow sequence diagrams, and security boundary implementations.
- **License:** Distributed under the MIT License.
