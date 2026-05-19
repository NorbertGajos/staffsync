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

    let query = supabaseAdmin.from('push_tokens').select('token, user_id')
    if (user_ids && user_ids.length > 0) {
      query = query.in('user_id', user_ids)
    }
    const { data: tokens } = await query

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ error: 'Brak tokenów – nikt nie włączył powiadomień' }, { status: 400 })
    }

    const accessToken = await getFirebaseAccessToken()

    const fcmUrl = `https://fcm.googleapis.com/v1/projects/staffsync-c7ea1/messages:send`

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
                }
              }
            }
          })
        })
        const json = await res.json()
        if (!res.ok) console.error('FCM error:', JSON.stringify(json))
        return json
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

  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signingInput = `${header}.${body}`

  const privateKey = serviceAccount.private_key
  const keyData = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\n/g, '')

  const binaryKey = Buffer.from(keyData, 'base64')

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const encoder = new TextEncoder()
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(signingInput)
  )

  const sig = Buffer.from(signature).toString('base64url')
  const jwt = `${signingInput}.${sig}`

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  })

  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) {
    console.error('Token error:', JSON.stringify(tokenData))
    throw new Error('Nie można uzyskać access token: ' + JSON.stringify(tokenData))
  }
  return tokenData.access_token
}