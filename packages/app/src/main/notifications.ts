import { Notification } from 'electron'

export function notify(title: string, body: string): void {
  if (!Notification.isSupported()) return
  const n = new Notification({ title, body, silent: false })
  n.show()
}
