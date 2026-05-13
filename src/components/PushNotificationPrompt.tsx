import { BellRing } from 'lucide-react'
import { useState } from 'react'
import {
  enablePushNotifications,
  getCurrentPushPermission,
  isPushNotificationSupported,
} from '../services/pushNotifications'

type PushNotificationPromptProps = {
  onNotice: (message: string) => void
}

export function PushNotificationPrompt({ onNotice }: PushNotificationPromptProps) {
  const [permission, setPermission] = useState<string>(() =>
    typeof window === 'undefined' ? 'unsupported' : getCurrentPushPermission(),
  )
  const [isEnabling, setIsEnabling] = useState(false)
  const isDenied = permission === 'denied'
  const isGranted = permission === 'granted'

  if (!isPushNotificationSupported() || isGranted) {
    return null
  }

  const handleEnable = async () => {
    try {
      setIsEnabling(true)
      await enablePushNotifications()
      setPermission(getCurrentPushPermission())
      onNotice('เปิดการแจ้งเตือนเมื่อมีผู้สมัครใหม่แล้ว')
    } catch (error) {
      onNotice(error instanceof Error ? error.message : 'เปิดการแจ้งเตือนไม่สำเร็จ')
    } finally {
      setIsEnabling(false)
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 px-4 sm:inset-x-auto sm:right-4 sm:w-96">
      <div className="rounded-2xl border border-[#ead8c7] bg-white p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#fbf1e7] text-[#8f6847]">
            <BellRing size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-950">
              แจ้งเตือนเมื่อมีผู้สมัครใหม่
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {isDenied
                ? 'Browser ปิดสิทธิ์แจ้งเตือน ต้องเปิด permission จากการตั้งค่า Browser ก่อน'
                : 'เปิดไว้เพื่อให้ระบบแจ้งเตือนแม้ไม่ได้อยู่หน้าเว็บ Admin'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="inline-flex h-10 items-center justify-center rounded-2xl bg-[#9a7655] px-4 text-sm font-semibold text-white transition hover:bg-[#8f6847] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isEnabling || isDenied || isGranted}
                onClick={handleEnable}
                type="button"
              >
                {isDenied
                  ? 'ถูกปิดใน Browser'
                  : isEnabling
                      ? 'กำลังเปิด...'
                      : 'เปิดการแจ้งเตือน'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
