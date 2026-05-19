import { initializeApp, getApps } from 'firebase/app'
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

export async function getMessagingInstance() {
  const supported = await isSupported()
  if (!supported) return null
  return getMessaging(app)
}

export async function requestNotificationPermission(userId: string) {
  try {
    const supported = await isSupported()
    if (!supported) return null

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null

    const messaging = getMessaging(app)
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
    })

    if (token) {
      // Zapisz token w Supabase
      const { createClient } = await import('./supabase')
      const supabase = createClient()
      await supabase.from('push_tokens').upsert({
        user_id: userId,
        token,
      }, { onConflict: 'user_id,token' })
    }

    return token
  } catch (error) {
    console.error('Błąd rejestracji powiadomień:', error)
    return null
  }
}

export { onMessage, getMessaging, getToken }
export default app