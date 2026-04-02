import OpenAI from 'openai'

// =============================================================================
// TYPES
// =============================================================================

interface RequestBody {
  readonly systemPrompt: string
  readonly userMessage: string
}

interface SuccessResponse {
  readonly content: string
}

interface ErrorResponse {
  readonly error: string
}

type Ok<T> = { readonly ok: true; readonly value: T }
type Err = { readonly ok: false; readonly error: string; readonly status: number }
type Result<T> = Ok<T> | Err

// =============================================================================
// CORS
// =============================================================================

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function json<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

// =============================================================================
// AUTH — optional JWT verification
// =============================================================================

async function verifyOptionalAuth(authHeader: string | null): Result<void> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token → free tier, allow through
    return { ok: true, value: undefined }
  }

  const token = authHeader.slice(7)
  const jwtSecret = Deno.env.get('SUPABASE_JWT_SECRET')

  if (!jwtSecret) {
    return { ok: false, error: 'Server misconfigured: missing JWT secret', status: 500 }
  }

  try {
    const encoder = new TextEncoder()
    const keyData = encoder.encode(jwtSecret)
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    )

    const [headerB64, payloadB64, signatureB64] = token.split('.')
    if (!headerB64 || !payloadB64 || !signatureB64) {
      return { ok: false, error: 'Invalid token format', status: 401 }
    }

    const data = encoder.encode(`${headerB64}.${payloadB64}`)
    const signature = base64UrlDecode(signatureB64)

    const valid = await crypto.subtle.verify('HMAC', key, signature, data)
    if (!valid) {
      return { ok: false, error: 'Invalid token signature', status: 401 }
    }

    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')))
    const now = Math.floor(Date.now() / 1000)
    if (typeof payload.exp === 'number' && payload.exp < now) {
      return { ok: false, error: 'Token expired', status: 401 }
    }

    return { ok: true, value: undefined }
  } catch {
    return { ok: false, error: 'Token verification failed', status: 401 }
  }
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// =============================================================================
// REQUEST VALIDATION
// =============================================================================

function parseRequestBody(body: unknown): Result<RequestBody> {
  if (
    typeof body !== 'object' ||
    body === null ||
    !('systemPrompt' in body) ||
    !('userMessage' in body)
  ) {
    return { ok: false, error: 'Missing required fields: systemPrompt, userMessage', status: 400 }
  }

  const { systemPrompt, userMessage } = body as Record<string, unknown>

  if (typeof systemPrompt !== 'string' || systemPrompt.trim().length === 0) {
    return { ok: false, error: 'systemPrompt must be a non-empty string', status: 400 }
  }

  if (typeof userMessage !== 'string' || userMessage.trim().length === 0) {
    return { ok: false, error: 'userMessage must be a non-empty string', status: 400 }
  }

  return { ok: true, value: { systemPrompt, userMessage } }
}

// =============================================================================
// OPENAI CALL
// =============================================================================

async function callOpenAI(body: RequestBody): Promise<Result<string>> {
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) {
    return { ok: false, error: 'Server misconfigured: missing OpenAI API key', status: 500 }
  }

  try {
    const client = new OpenAI({ apiKey })

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: body.systemPrompt },
        { role: 'user', content: body.userMessage },
      ],
      temperature: 0.3,
      max_tokens: 2048,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      return { ok: false, error: 'Empty response from AI', status: 502 }
    }

    return { ok: true, value: content }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown OpenAI error'
    return { ok: false, error: `AI request failed: ${message}`, status: 502 }
  }
}

// =============================================================================
// HANDLER
// =============================================================================

Deno.serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return json<ErrorResponse>({ error: 'Method not allowed' }, 405)
  }

  // 1. Verify optional auth
  const authResult = await verifyOptionalAuth(req.headers.get('Authorization'))
  if (!authResult.ok) {
    return json<ErrorResponse>({ error: authResult.error }, authResult.status)
  }

  // 2. Parse and validate body
  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return json<ErrorResponse>({ error: 'Invalid JSON body' }, 400)
  }

  const bodyResult = parseRequestBody(rawBody)
  if (!bodyResult.ok) {
    return json<ErrorResponse>({ error: bodyResult.error }, bodyResult.status)
  }

  // 3. Call OpenAI
  const aiResult = await callOpenAI(bodyResult.value)
  if (!aiResult.ok) {
    return json<ErrorResponse>({ error: aiResult.error }, aiResult.status)
  }

  // 4. Return result
  return json<SuccessResponse>({ content: aiResult.value })
})
