# Personalized Video Outreach System

## Executive Summary

A system that automates personalized video creation for sales prospects by pulling data from Pipedrive CRM, generating customized videos via Remotion, and delivering them through Resend email—transforming static outreach into dynamic, high-converting campaigns.

---

## 1. Data Flow Architecture

### Overview Pipeline

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Pipedrive     │────▶│   Render Server  │────▶│  Video Storage  │
│   (CRM Trigger) │     │   (Remotion)     │     │  (Cloudflare R2)│
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Webhook/API    │     │  Data Injection  │     │  Signed URL     │
│  Receiver       │     │  & Render Queue  │     │  Generation     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                         │
                                                         ▼
                                                 ┌─────────────────┐
                                                 │   Resend Email  │
                                                 │   Delivery      │
                                                 └─────────────────┘
```

### Detailed Flow

| Stage | Component | Action | Output |
|-------|-----------|--------|--------|
| **1. Trigger** | Pipedrive Webhook | New lead created, stage changed, or scheduled outreach date reached | `{ dealId, personId, type }` |
| **2. Data Fetch** | API Handler | Query Pipedrive API for deal + person + organization data | Prospect profile JSON |
| **3. Enrichment** | Enrichment Service | Optional: Clearbit/LeadsHook for tech stack, logo, industry | Enhanced prospect data |
| **4. Template Selection** | Template Router | Match prospect to best template based on segment/rules | Template ID + variants |
| **5. Render Queue** | Redis/BullMQ | Queue render job with prospect data payload | Job ID |
| **6. Video Render** | Remotion Lambda | Serverless render with dynamic compositions | MP4 file (H.264) |
| **7. Storage** | Cloudflare R2 | Upload video, generate thumbnail, create signed URL | Public/thumbnail URLs |
| **8. Email Send** | Resend API | Send personalized email with video thumbnail + play button | Message ID |
| **9. Tracking** | Analytics | Track video views, email opens, click-throughs | Engagement metrics |

### Trigger Types

```javascript
const TRIGGER_CONFIG = {
  // High-value: New qualified lead enters pipeline
  NEW_LEAD: {
    conditions: { lead_score: 'qualified', deal_value: { $gt: 5000 } },
    template: 'intro_high_value',
    priority: 'immediate'
  },
  
  // Nurture: Lead moves to demo stage
  STAGE_CHANGE: {
    stages: ['demo_requested', 'demo_scheduled'],
    template: 'demo_followup',
    priority: 'same_day'
  },
  
  // Re-engage: Cold leads
  SCHEDULED_OUTREACH: {
    conditions: { days_inactive: { $gt: 7 }, stage: 'cold' },
    template: 're_engagement',
    priority: 'scheduled'
  }
};
```

---

## 2. Video Template Strategy

### Personalization Layers

| Layer | Dynamic Element | Data Source | Impact Level |
|-------|----------------|-------------|--------------|
| **Tier 1: Core** | Prospect name (spoken + text) | Pipedrive person.name | High |
| **Tier 1: Core** | Company name/logo | Pipedrive org.name + logo URL | High |
| **Tier 2: Contextual** | Use case message | Custom field or inferred from industry | Medium |
| **Tier 2: Contextual** | Source reference | Pipedrive lead_source | Medium |
| **Tier 3: Advanced** | Feature highlights | Enrichment (tech stack) | Variable |
| **Tier 3: Advanced** | Rep intro/personalization | Assigned user profile | Medium |
| **Tier 3: Advanced** | Custom CTA | Segment-based A/B test | High |

### Remotion Template Structure

```
/video-templates/
├── intro-high-value/
│   ├── index.tsx          # Main composition
│   ├── scenes/
│   │   ├── IntroScene.tsx     # Name + company reveal
│   │   ├── ValueScene.tsx     # Problem/solution frame
│   │   ├── DemoScene.tsx      # Feature showcase
│   │   └── OutroScene.tsx     # CTA + next steps
│   ├── assets/
│   │   ├── animations/         # Lottie files
│   │   ├── backgrounds/       # Video backgrounds
│   │   └── music/             # Background tracks
│   └── config.ts             # Scene timing, colors
├── demo-followup/
│   └── ...
└── re-engagement/
    └── ...
```

### Template Composition Schema

```typescript
// Types for data injection
interface ProspectData {
  // Core (always available)
  firstName: string;
  lastName: string;
  company: string;
  companyLogo?: string;
  
  // Contextual (from Pipedrive custom fields)
  industry?: string;
  useCase?: string;
  leadSource?: string;
  repName?: string;
  repPhoto?: string;
  
  // Enriched (from external APIs)
  techStack?: string[];
  companySize?: 'startup' | 'smb' | 'enterprise';
  companyColor?: string;  // For dynamic theming
}

interface TemplateConfig {
  durationFrames: number;        // Total video length (30fps)
  scenes: SceneConfig[];
  audioTrack: string;
  defaultColors: ColorScheme;
  dynamicColors: boolean;        // Allow company color injection
}

interface SceneConfig {
  id: string;
  startFrame: number;
  endFrame: number;
  components: {
    type: 'text' | 'image' | 'video' | 'lottie';
    position: [number, number];    // x, y
    dynamicProp?: string;          // Maps to ProspectData key
    animation?: AnimationConfig;
  }[];
}
```

### Video Content Strategy by Use Case

**Intro/High-Value (60-90 seconds)**
- 0-10s: Animated name reveal with company logo
- 10-30s: "I noticed you're at [Company] doing [use case hint]..."
- 30-60s: Quick product demo relevant to their industry
- 60-90s: Clear CTA with rep name/calendar link

**Demo Follow-up (30-45 seconds)**
- 0-5s: "Great meeting, [Name]!"
- 5-25s: Recap of discussed features with screenshots
- 25-45s: Next steps + calendar link

**Re-engagement (20-30 seconds)**
- 0-5s: Quick attention-grabber
- 5-20s: One new feature relevant to them
- 20-30s: Low-friction CTA

---

## 3. Technical Components

### 3.1 Remotion Project Setup

```bash
# Project structure
npx create-video@latest personalized-outreach

# Key dependencies
npm install remotion @remotion/player @remotion/renderer
npm install @remotion/lambda                    # Serverless rendering
npm install @remotion/transitions               # Scene transitions
npm install lottie-react lottie-web             # Animated graphics
```

**Remotion Configuration** (`remotion.config.ts`):
```typescript
import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.setChromiumOptions({
  disableWebSecurity: true,  // Required for external images
});

// Lambda config for serverless
Config.setLambdaOptions({
  memorySize: 2048,
  timeout: 300,
  concurrency: 10,
});
```

### 3.2 Server Endpoint Architecture

**Technology**: Node.js + Express + BullMQ (Redis)

```typescript
// server/index.ts
import express from 'express';
import { Queue } from 'bullmq';
import { renderMediaOnLambda } from '@remotion/lambda';

const app = express();
const renderQueue = new Queue('video-renders', {
  connection: redis,
});

// Webhook endpoint for Pipedrive
app.post('/webhook/pipedrive', async (req, res) => {
  const { event, deal_id, person_id } = req.body;
  
  // Validate webhook signature
  if (!validateSignature(req)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Queue render job
  const job = await renderQueue.add('render', {
    trigger: event,
    dealId: deal_id,
    personId: person_id,
    timestamp: Date.now(),
  });
  
  res.json({ jobId: job.id, status: 'queued' });
});

// Render worker
renderQueue.process(async (job) => {
  const { dealId, personId } = job.data;
  
  // 1. Fetch prospect data
  const prospect = await fetchProspectData(dealId, personId);
  
  // 2. Select template
  const template = selectTemplate(prospect);
  
  // 3. Render video
  const result = await renderMediaOnLambda({
    region: 'us-east-1',
    composition: template.compositionId,
    serveUrl: 'https://your-bucket/remotion-bundle.zip',
    inputProps: prospect.toObject(),
    codec: 'h264',
    outputLocation: {
      bucketName: 'rendered-videos',
      key: `${prospect.id}/${Date.now()}.mp4`,
    },
  });
  
  // 4. Upload to R2
  const videoUrl = await uploadToR2(result.url, prospect.id);
  
  // 5. Send email
  await sendProspectEmail(prospect, videoUrl);
  
  return { success: true, videoUrl };
});
```

### 3.3 CRM Integration (Pipedrive)

**Webhook Configuration**:
```javascript
// Pipedrive webhook payload examples

// New lead
{
  "event": "deal.added",
  "deal_id": 123,
  "person_id": 456,
  "previous": null,
  "current": { "stage": 1, "value": 10000 }
}

// Stage change
{
  "event": "deal.stage.change",
  "deal_id": 123,
  "previous": { "stage": 2 },
  "current": { "stage": 5 }  // Demo scheduled
}
```

**Data Fetch Query**:
```typescript
async function fetchProspectData(dealId: string, personId: string) {
  // Parallel fetch for performance
  const [deal, person, org] = await Promise.all([
    pipedrive.deals.get(dealId),
    pipedrive.persons.get(personId),
    pipedrive.organizations.get(orgId),
  ]);
  
  return {
    firstName: person.first_name,
    lastName: person.last_name,
    email: person.email[0].value,
    company: org.name,
    companyLogo: await fetchLogo(org.name),  // Logo CDN
    dealValue: deal.value,
    stage: deal.stage_id,
    customFields: {
      useCase: deal['use_case'],
      leadSource: deal['lead_source'],
    },
    rep: {
      name: deal.creator_id.name,
      email: deal.creator_id.email,
      calendarUrl: deal.creator_id.calendar_link,
    },
  };
}
```

### 3.4 Video Storage Solution

**Recommendation: Cloudflare R2**

| Option | Pros | Cons | Est. Cost (10k videos/mo) |
|--------|------|------|--------------------------|
| **Cloudflare R2** ✓ | No egress fees, S3-compatible, fast CDN | Less mature ecosystem | $4.60 storage + $0 egress |
| AWS S3 | Mature, integrated | Egress fees add up | $23 storage + $85 egress |
| Mux | Optimized streaming, analytics | Higher cost, vendor lock-in | $200+ for streaming |
| Vercel Blob | Easy integration | Limited scale | $20 + overage |

**R2 Upload Flow**:
```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});

async function uploadToR2(videoBuffer: Buffer, prospectId: string) {
  const key = `videos/${prospectId}/${Date.now()}.mp4`;
  
  await r2.send(new PutObjectCommand({
    Bucket: 'prospect-videos',
    Key: key,
    Body: videoBuffer,
    ContentType: 'video/mp4',
  }));
  
  // Generate signed URL (7 day expiry)
  const signedUrl = await getSignedUrl(r2, new GetObjectCommand({
    Bucket: 'prospect-videos',
    Key: key,
  }), { expiresIn: 604800 });
  
  // Generate thumbnail
  const thumbnailKey = `thumbnails/${prospectId}/${Date.now()}.jpg`;
  await uploadThumbnail(videoBuffer, thumbnailKey);
  
  return { videoUrl: signedUrl, thumbnailUrl: getPublicUrl(thumbnailKey) };
}
```

### 3.5 Email Template (Resend)

**Email Structure**:
```tsx
// email-template.tsx
import { Html, Head, Body, Container, Img, Button, Text } from '@react-email/components';

export function VideoOutreachEmail({ prospect, videoUrl, thumbnailUrl }) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f6f9fc', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: 600, margin: '0 auto', padding: 40 }}>
          
          {/* Personalized greeting */}
          <Text style={{ fontSize: 24, marginBottom: 24 }}>
            Hey {prospect.firstName},
          </Text>
          
          <Text style={{ fontSize: 16, color: '#425475', marginBottom: 32 }}>
            I made a quick video specifically for {prospect.company} — 
            thought it might be relevant to what you're working on.
          </Text>
          
          {/* Video thumbnail with play button */}
          <a href={videoUrl} style={{ display: 'block', marginBottom: 32 }}>
            <div style={{ position: 'relative' }}>
              <Img 
                src={thumbnailUrl}
                style={{ width: '100%', borderRadius: 12 }}
              />
              {/* Play button overlay */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 80,
                height: 80,
                backgroundColor: 'rgba(255,255,255,0.9)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                ▶
              </div>
            </div>
          </a>
          
          {/* Secondary CTA */}
          <Text style={{ marginBottom: 24 }}>
            Or if you'd prefer to chat directly:
          </Text>
          
          <Button 
            href={prospect.rep.calendarUrl}
            style={{
              backgroundColor: '#0066FF',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: 8,
              textDecoration: 'none',
            }}
          >
            Book 15-min Call
          </Button>
          
          {/* Signature */}
          <Text style={{ marginTop: 40, color: '#666' }}>
            Best,<br />
            {prospect.rep.name}
          </Text>
          
        </Container>
      </Body>
    </Html>
  );
}
```

**Resend Send**:
```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'outreach@yourcompany.com',
  to: prospect.email,
  subject: `${prospect.firstName}, a quick video for ${prospect.company}`,
  react: VideoOutreachEmail({ prospect, videoUrl, thumbnailUrl }),
  headers: {
    'X-Entity-Ref-ID': `video-${prospect.id}-${Date.now()}`,  // Deduplication
  },
});
```

---

## 4. Cost Estimation

### Per-Video Breakdown

| Component | Tier | Cost per Video | Notes |
|-----------|------|----------------|-------|
| **Remotion Lambda** | Lambda | $0.008 - $0.015 | ~60s video at 720p |
| **Cloudflare R2** | Storage (1GB) | $0.0001 | 50MB video × 10k = $0.50/mo |
| **R2 Egress** | R2 | **$0** | No egress fees! |
| **Resend Email** | Email | $0.001 | 10k emails = $10/mo |
| **Logo/Enrichment** | Clearbit | ~$0.02 | Optional enrichment |
| **Total** | - | **~$0.01 - $0.04** | Per prospect |

### Scale Scenarios

| Monthly Volume | Remotion | R2 Storage | Resend | Enrichment | **Total** |
|----------------|----------|------------|--------|------------|-----------|
| 100 videos | $1 | $0.01 | $1 | $2 | **$4/mo** |
| 1,000 videos | $10 | $0.05 | $5 | $20 | **$35/mo** |
| 10,000 videos | $100 | $0.50 | $10 | $200 | **$310/mo** |
| 100,000 videos | $1,000 | $5 | $80 | $2,000 | **$3,085/mo** |

### Infrastructure Costs

| Service | Plan | Cost |
|---------|------|------|
| **Pipedrive CRM** | Advanced ($27.50/mo/seat) | $27.50 - $137.50 for 1-5 seats |
| **Render Server** | AWS Lambda / Cloudflare Workers | $5-20/mo |
| **Redis (BullMQ)** | Upstash free tier | $0 - $10/mo |
| **Monitoring** | Sentry free tier | $0 |
| **Total Fixed** | - | **$35 - $180/mo** |

### ROI Calculation

Assumptions:
- Video outreach: **15% reply rate** vs 3% cold email
- Deal value: $5,000 average
- Close rate on reply: 10%

**Per 100 videos**:
- 15 replies × 10% close = 1.5 deals = $7,500 revenue
- Cost: $4
- **ROI: 1,875x**

---

## 5. Use Cases Priority Matrix

| Use Case | Priority | Impact | Automation Level | Recommended Start |
|----------|----------|--------|------------------|-------------------|
| **1. Cold outreach (qualified leads)** | P0 | High volume, high conversion trigger | Fully automated | ✅ MVP |
| **2. Demo request follow-up** | P1 | High intent, fast response needed | Automated + manual approve | Phase 2 |
| **3. Trial activation nudges** | P2 | In-product trigger needed | Partially automated | Phase 2 |
| **4. Re-engagement (churned)** | P3 | Low conversion, manual review | Scheduled batch | Phase 3 |

### Detailed Use Case Specs

#### P0: Cold Outreach to Qualified Leads

**Trigger**: New deal created with `lead_status = "qualified"` or `deal_value > $5000`

**Template**: `intro-high-value` (60s)

**Personalization**:
- First name (spoken by AI voice or text overlay)
- Company name
- Industry-specific use case
- Rep photo/name

**Email**: Subject: `Hey {firstName}, quick video for {company}`

**Frequency Cap**: Max 1 video per prospect per 30 days

#### P1: Demo Follow-Up

**Trigger**: Deal moves to `demo_completed` stage OR tagged `demo_attended`

**Template**: `demo-followup` (30s)

**Personalization**:
- First name
- Features discussed (from custom field)
- Next steps from notes

**Timing**: Send within 2 hours of demo

#### P2: Trial Activation

**Trigger**: User signup + 24h inactivity OR key feature not used

**Template**: `activation-nudge` (20s)

**Integration**: Requires product analytics (Segment/PostHog)

---

## 6. MVP vs Full Version

### MVP (2-3 weeks)

| Feature | Implementation |
|---------|----------------|
| Trigger | Manual button in Pipedrive or webhook |
| Templates | 1 template (`intro-high-value`) |
| Personalization | Name + company only (text overlay) |
| Rendering | Remotion Lambda |
| Storage | Cloudflare R2 |
| Email | Basic Resend template with thumbnail |
| Voice/Audio | Background music only (no AI voice) |
| Tracking | Resend opens only |
| Queue | Single-file render (no BullMQ) |

**MVP Flow**:
1. Sales rep clicks "Send Video" button in Pipedrive
2. Server fetches deal data
3. Remotion renders with basic personalization
4. Email sent immediately

### Full Version (6-8 weeks)

| Feature | Implementation |
|---------|----------------|
| Trigger | Automated webhook triggers + scheduler |
| Templates | 3+ templates with A/B testing |
| Personalization | Full stack (voice, tech stack, CTAs) |
| Rendering | BullMQ queue with priority levels |
| Storage | R2 + CDN + thumbnail generation |
| Email | Rich templates with video embed fallback |
| Voice/Audio | ElevenLabs AI voice for name pronunciation |
| Tracking | Full analytics (video views, heatmap) |
| Enrichment | Clearbit/Dropcontact integration |
| Monitoring | Dashboard with render status, delivery metrics |

---

## 7. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

**Goal**: Working MVP that generates videos

| Task | Days | Owner | Dependencies |
|------|------|-------|--------------|
| Remotion project setup | 1 | Dev | None |
| Basic template (name + company) | 2 | Dev | Remotion setup |
| Pipedrive API integration | 1 | Dev | API keys |
| R2 bucket setup + upload | 0.5 | Dev | Cloudflare account |
| Resend account + basic template | 0.5 | Dev | Resend account |
| Webhook endpoint (manual trigger) | 1 | Dev | All above |
| Testing + bug fixes | 2 | Dev | All above |

**Deliverable**: Click webhook URL → get personalized video email

---

### Phase 2: Automation (Week 3-4)

**Goal**: Fully automated from CRM events

| Task | Days | Owner | Dependencies |
|------|------|-------|--------------|
| Pipedrive webhook registration | 0.5 | Dev | Phase 1 |
| BullMQ render queue | 1 | Dev | Redis |
| Template routing logic | 1 | Dev | Segments defined |
| Add 2nd template (demo followup) | 2 | Design + Dev | Phase 1 |
| Error handling + retries | 1 | Dev | BullMQ |
| Pipedrive "Send Video" custom field | 0.5 | Dev | Pipedrive admin |
| Logging + basic monitoring | 1 | Dev | Sentry/etc |

**Deliverable**: New qualified lead → automatic video email

---

### Phase 3: Enhancement (Week 5-6)

**Goal**: Better personalization and tracking

| Task | Days | Owner | Dependencies |
|------|------|-------|--------------|
| Clearbit enrichment integration | 1 | Dev | API key + budget |
| Logo fetch + injection | 1 | Dev | Clearbit/logo API |
| Video view tracking (pixel) | 1 | Dev | Analytics choice |
| Email open/click tracking | 0.5 | Dev | Resend events |
| Third template (re-engagement) | 2 | Design + Dev | Phase 2 |
| Rate limiting + deduplication | 1 | Dev | Redis |
| Admin dashboard (render status) | 2 | Dev | Frontend |

**Deliverable**: Rich personalization + visibility

---

### Phase 4: Scale & Polish (Week 7-8)

**Goal**: Production-ready, efficient, delightful

| Task | Days | Owner | Dependencies |
|------|------|-------|--------------|
| AI voice integration (ElevenLabs) | 2 | Dev | ElevenLabs API |
| Thumbnail generation (optimized) | 1 | Dev | FFmpeg |
| A/B testing for templates | 2 | Dev | Analytics |
| Batch processing for re-engagement | 1 | Dev | Scheduler |
| Performance optimization | 1 | Dev | Load testing |
| Documentation + runbooks | 1 | Dev | Complete system |
| Security audit | 1 | Dev | Security |

**Deliverable**: Full system at scale

---

## Technical Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PROSPECT VIDEO PIPELINE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐         ┌──────────────────────────────────────────┐      │
│  │  Pipedrive   │         │              RENDER SERVER               │      │
│  │              │         │                                          │      │
│  │  ┌────────┐  │  POST   │  ┌─────────┐    ┌─────────────────────┐ │      │
│  │  │ Deal   │──┼────────▶│  │ webhook │───▶│ BullMQ Render Queue │ │      │
│  │  │ Added  │  │         │  │ receiver│    │  ┌───────────────┐  │ │      │
│  │  └────────┘  │         │  └─────────┘    │  │ Render Worker │  │ │      │
│  │              │         │        │         │  └───────┬───────┘  │ │      │
│  │  ┌────────┐  │         │        │         └──────────┼──────────┘ │      │
│  │  │ Stage  │  │         │        ▼                    │            │      │
│  │  │ Change │  │         │  ┌─────────────┐           │            │      │
│  │  └────────┘  │         │  │ Data Fetch  │           │            │      │
│  │              │         │  │ (Pipedrive) │           │            │      │
│  └──────────────┘         │  └──────┬──────┘           │            │      │
│                           │         │                   │            │      │
│                           │         ▼                   ▼            │      │
│                           │  ┌─────────────┐    ┌──────────────┐   │      │
│                           │  │Enrichment   │    │Remotion       │   │      │
│                           │  │(Clearbit)   │    │Lambda         │   │      │
│                           │  └──────┬──────┘    └──────┬───────┘   │      │
│                           │         │                  │           │      │
│                           └─────────┼──────────────────┼───────────┘      │
│                                     │                  │                  │
│                                     ▼                  ▼                  │
│                           ┌─────────────────────────────────┐            │
│                           │      Cloudflare R2 Storage      │            │
│                           │                                 │            │
│                           │  videos/{prospect_id}/{ts}.mp4  │            │
│                           │  thumbnails/{prospect_id}/.jpg  │            │
│                           └────────────────┬────────────────┘            │
│                                            │                              │
│                                            ▼                              │
│                           ┌─────────────────────────────────┐            │
│                           │         Resend Email            │            │
│                           │                                 │            │
│                           │  Video thumbnail + play button  │            │
│                           │  Calendar CTA                   │            │
│                           │  Signed video URL               │            │
│                           └─────────────────────────────────┘            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Decisions & Recommendations

### 1. Storage: Cloudflare R2 over S3
**Rationale**: Zero egress fees save hundreds per month at scale. S3-compatible API means no code changes if we need to migrate later.

### 2. Rendering: Remotion Lambda over always-on server
**Rationale**: Pay per render, scales infinitely, no server maintenance. Cold start acceptable for non-realtime outreach.

### 3. Enrichment: Optional (start without)
**Rationale**: Clearbit adds $0.02/video cost. Worth it at high volumes, but MVP works with just CRM data.

### 4. Voice: ElevenLabs for MVP, consider lip-sync for v2
**Rationale**: AI voice personalization (name pronunciation) increases engagement. Full avatar/lip-sync (+$5k setup) can wait.

### 5. Tracking: Start simple
**Rationale**: Resend's built-in analytics cover opens/clicks. Video view tracking adds complexity—add after proving value.

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Render failures | Medium | High | Retry queue + fallback static video |
| Email deliverability | Medium | High | Warm up domain, monitor spam reports |
| Enrichment API limits | Low | Low | Cache results, rate limit calls |
| Video file sizes | Low | Medium | Compress to 720p, 50MB max |
| Prospect privacy | Low | High | Clear consent in CRM, easy unsubscribe |

---

## Success Metrics

| Metric | Target (Month 1) | Target (Month 3) |
|--------|-----------------|-----------------|
| Videos sent | 50 | 500 |
| Email open rate | >40% | >50% |
| Video play rate | >30% | >40% |
| Reply rate | >10% | >15% |
| Booked demos from video | 2 | 20 |
| Render success rate | >95% | >99% |

---

## Next Steps

1. **Confirm stack**: Validate R2 + Remotion Lambda + Resend choices with team
2. **Define first template**: Storyboard intro video scenes
3. **Set up accounts**: Cloudflare R2, Resend, ensure Pipedrive API access
4. **Build MVP**: Follow Phase 1 roadmap
5. **Test with real prospects**: 10-20 manual triggers, iterate on template

---

*Document created: 2026-02-15*
*Version: 1.0*
*Author: OpenClaw Design System*