import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: Request) {
  try {
    const { title, body, user_ids } = await request.json()

    if (!title || !body) {
      return NextResponse.json({ error: 'Brak tytułu lub treści' }, { status: 400 })
    }

    // Pobierz tokeny – wszystkich lub wybranych użytkowników
    let query = supabaseAdmin.from('push_tokens').select('token, user_id')
    if (user_ids && user_ids.length > 0) {
      query = query.in('user_id', user_ids)
    }
    const { data: tokens } = await query

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ error: 'Brak tokenów – nikt nie włączył powiadomień' }, { status: 400 })
    }

    // Wyślij przez Firebase Cloud Messaging
    const fcmUrl = 'https://fcm.googleapis.com/v1/projects/staffsync-c7ea1/messages:send'

    const accessToken = await getFirebaseAccessToken()

    const results = await Promise.allSettled(
      tokens.map(async ({ token }) => {
        const res = await fetch(fcmUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            message: {
              token,
              notification: { title, body },
              webpush: {
                notification: {
                  title,
                  body,
                  icon: '/icon-192.png',
                  badge: '/icon-192.png',
                  vibrate: [200, 100, 200],
                }
              }
            }
          })
        })
        return res.json()
      })
    )

    const sent = results.filter(r => r.status === 'fulfilled').length

    return NextResponse.json({ success: true, sent, total: tokens.length })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function getFirebaseAccessToken(): Promise<string> {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!)

  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  }

  // Zakoduj JWT
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
  const signingInput = `${header}.${body}`

  // Podpisz używając klucza prywatnego
  const privateKey = serviceAccount.private_key
  const encoder = new TextEncoder()
  const keyData = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\n/g, '')

  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0))
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', binaryKey.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(signingInput)
  )

  const jwt = `${signingInput}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`

  // Wymień JWT na access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  })

  const tokenData = await tokenRes.json()
  return tokenData.access_token
}