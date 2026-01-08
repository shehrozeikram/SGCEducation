// Simple event-based notification service to trigger top-right toasts
// Usage: import { notifySuccess, notifyError, notifyInfo, notifyWarning } from '../utils/notificationService';

const subscribers = new Set();

const notify = (payload) => {
  subscribers.forEach((cb) => cb(payload));
};

export const subscribeNotifications = (cb) => {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
};

export const notifySuccess = (message) =>
  notify({ message, severity: 'success' });

export const notifyError = (message) =>
  notify({ message, severity: 'error' });

export const notifyInfo = (message) =>
  notify({ message, severity: 'info' });

export const notifyWarning = (message) =>
  notify({ message, severity: 'warning' });

export default {
  notifySuccess,
  notifyError,
  notifyInfo,
  notifyWarning,
  subscribeNotifications,
};

