importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyBLgnUgd8ZeFc2cPiG5Fpek8gItZxhEw9g',
  authDomain: 'staffsync-c7ea1.firebaseapp.com',
  projectId: 'staffsync-c7ea1',
  storageBucket: 'staffsync-c7ea1.firebasestorage.app',
  messagingSenderId: '149002299776',
  appId: '1:149002299776:web:5017c950aae0fd7165b965',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage(function(payload) {
  console.log('Otrzymano powiadomienie w tle:', payload)

  const { title, body, icon } = payload.notification || {}

  self.registration.showNotification(title || 'StaffSync', {
    body: body || 'Masz nowe powiadomienie',
    icon: icon || '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: payload.data,
  })
})