// Lightweight global notification helper.
// Works anywhere (components, services) without importing React.

const EVENT_NAME = 'app:notify';

export function notify(detail) {
  if (!detail || !detail.message) return;
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail }));
}

export function notifySuccess(message, options = {}) {
  notify({ severity: 'success', message, ...options });
}

export function notifyError(message, options = {}) {
  notify({ severity: 'error', message, ...options });
}

export function notifyInfo(message, options = {}) {
  notify({ severity: 'info', message, ...options });
}

export function notifyWarning(message, options = {}) {
  notify({ severity: 'warning', message, ...options });
}

export const NOTIFY_EVENT_NAME = EVENT_NAME;


