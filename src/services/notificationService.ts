// Notification Service for 160 ONE SIXTY
// Anti-spam key, Web Audio chime, Browser Notification API & Internal Notification Center

import { AppNotification, NotificationType } from '../types';
import { getAllFromStore, putToStore, STORES, getByIdFromStore } from '../db/indexedDb';
import { soundManager } from './audio';

export async function createNotification(params: {
  notificationKey: string;
  title: string;
  message: string;
  type: NotificationType;
  linkMenu?: string;
  targetId?: string;
}): Promise<AppNotification | null> {
  // Check anti-spam: if notification with this key already exists, do not duplicate!
  const existingNotifications = await getAllFromStore<AppNotification>(STORES.NOTIFICATIONS);
  const exists = existingNotifications.some((n) => n.notificationKey === params.notificationKey);
  if (exists) {
    return null;
  }

  const newNotif: AppNotification = {
    id: 'NOTIF-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    notificationKey: params.notificationKey,
    title: params.title,
    message: params.message,
    type: params.type,
    linkMenu: params.linkMenu,
    targetId: params.targetId,
    isRead: false,
    createdAt: new Date().toISOString()
  };

  await putToStore(STORES.NOTIFICATIONS, newNotif);

  // Trigger Audio Chime if enabled in config
  try {
    const config = await getByIdFromStore<{ soundEnabled?: boolean; soundVolume?: number }>(STORES.APP_CONFIG, 'config');
    const isSoundOn = config?.soundEnabled ?? true;
    const vol = config?.soundVolume ?? 80;

    if (isSoundOn) {
      if (params.type === 'ORDER_BARU') {
        soundManager.playNewOrderChime(vol, params.notificationKey);
      } else {
        soundManager.playSuccessTone(vol);
      }
    }
  } catch {
    // Non-blocking
  }

  // Trigger Browser / System Notification if granted
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        new Notification(params.title, {
          body: params.message,
          icon: '/icons/icon.svg',
          badge: '/icons/icon.svg',
          tag: params.notificationKey
        });
      } catch {
        // Fallback for mobile SW notification
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification(params.title, {
              body: params.message,
              icon: '/icons/icon.svg',
              tag: params.notificationKey
            });
          }).catch(() => {});
        }
      }
    }
  }

  return newNotif;
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return await Notification.requestPermission();
}
