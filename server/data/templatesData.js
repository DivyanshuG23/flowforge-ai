// Verified, realistic built-in templates built strictly from currently supported node types
export const BUILT_IN_TEMPLATES = [
  {
    id: 'ai-incident-triage',
    name: 'AI Incident Triage & Smart Recovery',
    category: 'AI & Automation',
    badge: 'Multi-Provider AI',
    badgeColor: 'text-[#E5B45B] bg-[#E5B45B]/10 border-[#E5B45B]/20',
    description: 'Ingests system incident telemetry, evaluates severity with Google Gemini (with optional 4-provider failover to Groq, OpenAI, or Mistral), and branches critical alerts for priority escalation.',
    nodeCount: 6,
    edgeCount: 6,
    flowPreview: ['Webhook Alert', 'AI Anomaly Triage', 'Severity Rule', 'Escalation Action', 'Resolution Output'],
    workflowData: {
      name: 'AI Incident Triage & Smart Recovery',
      description: 'Ingests incident telemetry, uses Gemini for anomaly classification (with multi-provider failover), and conditionally routes critical events.',
      nodes: [
        {
          id: 'node-trigger-1',
          type: 'custom',
          position: { x: 80, y: 180 },
          data: {
            type: 'trigger',
            label: 'Webhook Alert Ingestion',
            description: 'Listens for system events and alert telemetry',
            payload: {
              service: 'payment-gateway',
              errorRatePercent: 14.8,
              latencyP99Ms: 2450,
              message: 'Database connection pool exhausted during transaction commit'
            }
          }
        },
        {
          id: 'node-ai-1',
          type: 'custom',
          position: { x: 420, y: 180 },
          data: {
            type: 'ai',
            label: 'AI Incident Triage',
            provider: 'gemini',
            model: 'gemini-3.8-flash',
            enableFailover: true,
            prompt: 'Analyze the system incident payload and determine severity. Output JSON with fields: { severity: "high" | "low", reason: string, recommendedAction: string }.',
            systemPrompt: 'You are an autonomous SRE incident classifier assistant.',
            outputFormat: 'json',
            temperature: 0.2,
            maxTokens: 1024,
            timeoutMs: 15000
          }
        },
        {
          id: 'node-condition-1',
          type: 'custom',
          position: { x: 760, y: 180 },
          data: {
            type: 'condition',
            label: 'High Severity Branch',
            field: 'structured.severity',
            operator: 'equals',
            value: 'high'
          }
        },
        {
          id: 'node-action-high',
          type: 'custom',
          position: { x: 1100, y: 80 },
          data: {
            type: 'action',
            label: 'Urgent Ops Dispatcher',
            description: 'Formats high-priority notification payload for on-call teams'
          }
        },
        {
          id: 'node-action-routine',
          type: 'custom',
          position: { x: 1100, y: 280 },
          data: {
            type: 'action',
            label: 'Routine Telemetry Logger',
            description: 'Archives standard non-critical incident metadata'
          }
        },
        {
          id: 'node-output-1',
          type: 'custom',
          position: { x: 1420, y: 180 },
          data: {
            type: 'output',
            label: 'Incident Resolution Output',
            description: 'Commits triage report and returns response payload'
          }
        }
      ],
      edges: [
        { id: 'e1-2', source: 'node-trigger-1', target: 'node-ai-1', animated: true },
        { id: 'e2-3', source: 'node-ai-1', target: 'node-condition-1', animated: true },
        { id: 'e3-4', source: 'node-condition-1', target: 'node-action-high', sourceHandle: 'true', animated: true },
        { id: 'e3-5', source: 'node-condition-1', target: 'node-action-routine', sourceHandle: 'false', animated: true },
        { id: 'e4-6', source: 'node-action-high', target: 'node-output-1', animated: true },
        { id: 'e5-6', source: 'node-action-routine', target: 'node-output-1', animated: true }
      ]
    }
  },
  {
    id: 'sentiment-routing-pipeline',
    name: 'Customer Sentiment & Priority Router',
    category: 'Customer Experience',
    badge: 'LLM Classifier',
    badgeColor: 'text-[#059669] bg-[#059669]/10 border-[#059669]/20',
    description: 'Analyzes incoming support inquiries using Gemini reasoning, categorizing sentiment and dispatching urgent tickets to priority queues.',
    nodeCount: 6,
    edgeCount: 6,
    flowPreview: ['Support Webhook', 'Sentiment LLM', 'Negative Check', 'VIP Queue', 'Dispatch Summary'],
    workflowData: {
      name: 'Customer Sentiment & Priority Router',
      description: 'Routes incoming customer tickets dynamically based on Gemini sentiment analysis.',
      nodes: [
        {
          id: 'node-trigger-ticket',
          type: 'custom',
          position: { x: 80, y: 180 },
          data: {
            type: 'trigger',
            label: 'Support Ticket Ingest',
            description: 'Listens for customer inquiries and feedback submissions',
            payload: {
              ticketId: 'TCK-8921',
              customerEmail: 'alex@enterprise.org',
              message: 'Our production database is experiencing connection timeouts and customer transactions are failing. We need urgent escalation.'
            }
          }
        },
        {
          id: 'node-ai-sentiment',
          type: 'custom',
          position: { x: 420, y: 180 },
          data: {
            type: 'ai',
            label: 'Gemini Sentiment Analyzer',
            provider: 'gemini',
            model: 'gemini-3.8-flash',
            prompt: 'Analyze the sentiment and urgency of the customer message. Output JSON with { sentiment: "negative" | "positive" | "neutral", urgencyLevel: 1-5, topic: string }.',
            systemPrompt: 'You are an autonomous customer success triage specialist.',
            outputFormat: 'json',
            temperature: 0.1,
            maxTokens: 1024,
            timeoutMs: 15000
          }
        },
        {
          id: 'node-cond-sentiment',
          type: 'custom',
          position: { x: 760, y: 180 },
          data: {
            type: 'condition',
            label: 'Negative Sentiment Filter',
            field: 'structured.sentiment',
            operator: 'equals',
            value: 'negative'
          }
        },
        {
          id: 'node-action-urgent',
          type: 'custom',
          position: { x: 1100, y: 80 },
          data: {
            type: 'action',
            label: 'Priority Queue Assignment',
            description: 'Routes customer ticket to tier-1 escalation specialists'
          }
        },
        {
          id: 'node-action-standard',
          type: 'custom',
          position: { x: 1100, y: 280 },
          data: {
            type: 'action',
            label: 'Standard Queue Routing',
            description: 'Routes customer inquiry to general support queue'
          }
        },
        {
          id: 'node-output-sentiment',
          type: 'custom',
          position: { x: 1420, y: 180 },
          data: {
            type: 'output',
            label: 'Routing Confirmation',
            description: 'Commits ticket routing result and returns acknowledgment'
          }
        }
      ],
      edges: [
        { id: 'es-1-2', source: 'node-trigger-ticket', target: 'node-ai-sentiment', animated: true },
        { id: 'es-2-3', source: 'node-ai-sentiment', target: 'node-cond-sentiment', animated: true },
        { id: 'es-3-4', source: 'node-cond-sentiment', target: 'node-action-urgent', sourceHandle: 'true', animated: true },
        { id: 'es-3-5', source: 'node-cond-sentiment', target: 'node-action-standard', sourceHandle: 'false', animated: true },
        { id: 'es-4-6', source: 'node-action-urgent', target: 'node-output-sentiment', animated: true },
        { id: 'es-5-6', source: 'node-action-standard', target: 'node-output-sentiment', animated: true }
      ]
    }
  },
  {
    id: 'rest-api-bridge',
    name: 'Webhook Normalizer & Outbound API Bridge',
    category: 'Integrations & Webhooks',
    badge: 'REST API',
    badgeColor: 'text-[#E5B45B] bg-[#E5B45B]/10 border-[#E5B45B]/20',
    description: 'Listens for third-party webhooks, sanitizes input payloads, and dispatches authenticated HTTPS POST requests with SSRF guards.',
    nodeCount: 4,
    edgeCount: 3,
    flowPreview: ['Incoming Webhook', 'Payload Transform', 'External REST Dispatch', 'Response Return'],
    workflowData: {
      name: 'Webhook Normalizer & Outbound API Bridge',
      description: 'Transforms raw webhook payloads and relays them to external APIs safely.',
      nodes: [
        {
          id: 'node-trig-hook',
          type: 'custom',
          position: { x: 100, y: 180 },
          data: {
            type: 'trigger',
            label: 'Incoming Webhook Event',
            description: 'Receives external HTTP payloads'
          }
        },
        {
          id: 'node-act-transform',
          type: 'custom',
          position: { x: 450, y: 180 },
          data: {
            type: 'action',
            label: 'Payload Normalizer',
            description: 'Formats and maps event fields into standard JSON'
          }
        },
        {
          id: 'node-api-forward',
          type: 'custom',
          position: { x: 800, y: 180 },
          data: {
            type: 'api',
            label: 'Outbound HTTPS Dispatch',
            description: 'Dispatches payload to remote endpoint with SSRF protection',
            url: 'https://httpbin.org/post',
            method: 'POST'
          }
        },
        {
          id: 'node-out-hook',
          type: 'custom',
          position: { x: 1150, y: 180 },
          data: {
            type: 'output',
            label: 'Relay Confirmation',
            description: 'Returns confirmation with external dispatch status'
          }
        }
      ],
      edges: [
        { id: 'ew-1-2', source: 'node-trig-hook', target: 'node-act-transform', animated: true },
        { id: 'ew-2-3', source: 'node-act-transform', target: 'node-api-forward', animated: true },
        { id: 'ew-3-4', source: 'node-api-forward', target: 'node-out-hook', animated: true }
      ]
    }
  },
  {
    id: 'synthetic-health-probe',
    name: 'Synthetic Service Health & Outage Alert',
    category: 'Monitoring & Ops',
    badge: 'Health Probe',
    badgeColor: 'text-[#059669] bg-[#059669]/10 border-[#059669]/20',
    description: 'Probes remote service endpoints with HTTP GET and checks status 200, routing outages through an automated alert sequence.',
    nodeCount: 6,
    edgeCount: 6,
    flowPreview: ['Scheduled Pulse', 'API Health GET', 'Check Status 200', 'Outage Alarm', 'Commit Health Log'],
    workflowData: {
      name: 'Synthetic Service Health & Outage Alert',
      description: 'Probes remote HTTP endpoints and branches on failure to trigger alerts.',
      nodes: [
        {
          id: 'node-trig-probe',
          type: 'custom',
          position: { x: 80, y: 180 },
          data: {
            type: 'trigger',
            label: 'Scheduled Pulse Trigger',
            description: 'Initiates automated service health probe'
          }
        },
        {
          id: 'node-api-check',
          type: 'custom',
          position: { x: 420, y: 180 },
          data: {
            type: 'api',
            label: 'Service Endpoint Check',
            description: 'Performs HTTP GET against target service',
            url: 'https://httpbin.org/status/200',
            method: 'GET'
          }
        },
        {
          id: 'node-cond-status',
          type: 'custom',
          position: { x: 760, y: 180 },
          data: {
            type: 'condition',
            label: 'Verify HTTP 200',
            field: 'status',
            operator: 'equals',
            value: 200
          }
        },
        {
          id: 'node-act-green',
          type: 'custom',
          position: { x: 1100, y: 80 },
          data: {
            type: 'action',
            label: 'Record Uptime Metric',
            description: 'Logs verified healthy response to operational ledger'
          }
        },
        {
          id: 'node-act-alert',
          type: 'custom',
          position: { x: 1100, y: 280 },
          data: {
            type: 'action',
            label: 'Outage Notification Alert',
            description: 'Formulates incident alert payload with error status'
          }
        },
        {
          id: 'node-out-probe',
          type: 'custom',
          position: { x: 1420, y: 180 },
          data: {
            type: 'output',
            label: 'Health Check State',
            description: 'Commits health verification outcome'
          }
        }
      ],
      edges: [
        { id: 'ep-1-2', source: 'node-trig-probe', target: 'node-api-check', animated: true },
        { id: 'ep-2-3', source: 'node-api-check', target: 'node-cond-status', animated: true },
        { id: 'ep-3-4', source: 'node-cond-status', target: 'node-act-green', sourceHandle: 'true', animated: true },
        { id: 'ep-3-5', source: 'node-cond-status', target: 'node-act-alert', sourceHandle: 'false', animated: true },
        { id: 'ep-4-6', source: 'node-act-green', target: 'node-out-probe', animated: true },
        { id: 'ep-5-6', source: 'node-act-alert', target: 'node-out-probe', animated: true }
      ]
    }
  },
  {
    id: 'ai-document-summarizer',
    name: 'Executive Briefing & Key Insights Agent',
    category: 'AI & Automation',
    badge: 'Gemini AI',
    badgeColor: 'text-[#E5B45B] bg-[#E5B45B]/10 border-[#E5B45B]/20',
    description: 'Summarizes complex text or report payloads into structured executive action items using Gemini 2.5 Flash.',
    nodeCount: 4,
    edgeCount: 3,
    flowPreview: ['Payload Ingest', 'Text Chunking', 'Gemini Summarizer', 'Briefing Output'],
    workflowData: {
      name: 'Executive Briefing & Key Insights Agent',
      description: 'Extracts structured executive takeaways and action items using Gemini 2.5 Flash.',
      nodes: [
        {
          id: 'node-trig-doc',
          type: 'custom',
          position: { x: 100, y: 180 },
          data: {
            type: 'trigger',
            label: 'Report Payload Ingest',
            description: 'Receives documents and unstructured notes'
          }
        },
        {
          id: 'node-act-chunk',
          type: 'custom',
          position: { x: 450, y: 180 },
          data: {
            type: 'action',
            label: 'Text Chunk Normalizer',
            description: 'Prepares structured paragraphs for LLM reasoning'
          }
        },
        {
          id: 'node-ai-summary',
          type: 'custom',
          position: { x: 800, y: 180 },
          data: {
            type: 'ai',
            label: 'Gemini Briefing Engine',
            provider: 'gemini',
            model: 'gemini-3.8-flash',
            prompt: 'Summarize the input text into executive briefing bullet points. Output JSON with { executiveSummary: string, keyActionItems: string[], priority: "high" | "medium" | "low" }.',
            systemPrompt: 'You are an executive chief of staff analyst.',
            outputFormat: 'json',
            temperature: 0.3,
            maxTokens: 1024
          }
        },
        {
          id: 'node-out-doc',
          type: 'custom',
          position: { x: 1150, y: 180 },
          data: {
            type: 'output',
            label: 'Executive Briefing Result',
            description: 'Commits finalized briefing and returns action items'
          }
        }
      ],
      edges: [
        { id: 'ed-1-2', source: 'node-trig-doc', target: 'node-act-chunk', animated: true },
        { id: 'ed-2-3', source: 'node-act-chunk', target: 'node-ai-summary', animated: true },
        { id: 'ed-3-4', source: 'node-ai-summary', target: 'node-out-doc', animated: true }
      ]
    }
  }
];
