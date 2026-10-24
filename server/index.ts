// Load .env with override so the project's own configuration always wins over
// any stray ambient value (e.g. a PORT left in the shell environment). Without
// override, an ambient PORT would silently move the server off 8787 and break
// the Vite dev proxy, which targets the same configured port (see vite.config.ts).
import { config as loadEnv } from 'dotenv';
loadEnv({ override: true });
import express from 'express';
import { generateAssessment } from './aiService';
import type { AssessmentRequest } from '../src/types';

const app = express();

app.use(express.json());

// User-facing fallback message. Kept generic and credential-free: it never
// references the API key, model name, or any underlying error detail.
const FALLBACK_MESSAGE =
  'The resilience assessment could not be generated right now. The map and exposure analysis remain available; please try again.';

// Health check so the dev proxy and tooling can confirm the API is up.
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// Secure AI assessment endpoint. Makes exactly one model call via the single
// generateAssessment seam. On ANY failure (missing key, OpenAI error, invalid
// JSON) it returns a clean { error, fallbackMessage } without crashing and
// without ever leaking a credential value. No automatic retry.
app.post('/api/assessment', async (req, res) => {
  try {
    const input = req.body as AssessmentRequest;
    const assessment = await generateAssessment(input);
    res.status(200).json(assessment);
  } catch (err) {
    // Log only a short, credential-free label — never the error object (which
    // could echo request detail) and never the API key.
    const label = err instanceof Error ? err.name : 'UnknownError';
    console.error(`[api] /api/assessment failed: ${label}`);
    res.status(502).json({
      error: 'assessment_unavailable',
      fallbackMessage: FALLBACK_MESSAGE,
    });
  }
});

const PORT = Number(process.env.PORT) || 8787;

app.listen(PORT, () => {
  console.log(`[api] HarborGuard server listening on http://localhost:${PORT}`);
});
