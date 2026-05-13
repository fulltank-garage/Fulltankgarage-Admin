import { pushNotificationApi } from './api'

const serviceWorkerPath = '/admin-sw.js'

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index)
  }

  return outputArray
}

export const isPushNotificationSupported = () =>
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window

export const getCurrentPushPermission = () => {
  if (!('Notification' in window)) {
    return 'unsupported'
  }

  return Notification.permission
}

const registerPushServiceWorker = async () => {
  const registration = await navigator.serviceWorker.register(serviceWorkerPath, {
    scope: '/',
  })

  await registration.update().catch(() => undefined)

  return navigator.serviceWorker.ready
}

export const enablePushNotifications = async () => {
  if (!isPushNotificationSupported()) {
    throw new Error('อุปกรณ์นี้ยังไม่รองรับการแจ้งเตือน')
  }

  const publicKey = await pushNotificationApi.getPublicKey()
  if (!publicKey.configured || !publicKey.publicKey) {
    throw new Error('ยังไม่ได้ตั้งค่า Push Notification ใน API')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('ยังไม่ได้อนุญาตการแจ้งเตือน')
  }

  const registration = await registerPushServiceWorker()
  const existingSubscription =
    await registration.pushManager.getSubscription()
  if (existingSubscription) {
    await pushNotificationApi.subscribe(existingSubscription)
    return existingSubscription
  }

  const subscription = await registration.pushManager.subscribe({
    applicationServerKey: urlBase64ToUint8Array(publicKey.publicKey),
    userVisibleOnly: true,
  })

  await pushNotificationApi.subscribe(subscription)
  return subscription
}

export const getCurrentPushSubscription = async () => {
  if (!isPushNotificationSupported() || Notification.permission !== 'granted') {
    return null
  }

  const registration = await registerPushServiceWorker()

  return registration.pushManager.getSubscription()
}
