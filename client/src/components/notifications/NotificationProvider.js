import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';
import { NOTIFY_EVENT_NAME } from '../../utils/notify';

const NotificationContext = createContext(null);

let nextId = 1;

function normalize(detail) {
  const severity = detail?.severity || 'info';
  const message = detail?.message || '';
  const autoHideDuration = Number.isFinite(detail?.autoHideDuration) ? detail.autoHideDuration : 5000;
  return {
    id: detail?.id ?? nextId++,
    severity,
    message,
    autoHideDuration,
  };
}

export function NotificationProvider({ children }) {
  const queueRef = useRef([]);
  const [current, setCurrent] = useState(null);
  const [open, setOpen] = useState(false);

  const showNext = useCallback(() => {
    const next = queueRef.current.shift();
    if (next) {
      setCurrent(next);
      setOpen(true);
    } else {
      setCurrent(null);
      setOpen(false);
    }
  }, []);

  const enqueue = useCallback(
    (detail) => {
      const item = normalize(detail);
      if (!item.message) return;

      if (!current) {
        setCurrent(item);
        setOpen(true);
        return;
      }

      queueRef.current.push(item);
      // If a toast is already open, we let it finish; next will show on exit.
    },
    [current]
  );

  useEffect(() => {
    const handler = (e) => enqueue(e.detail);
    window.addEventListener(NOTIFY_EVENT_NAME, handler);
    return () => window.removeEventListener(NOTIFY_EVENT_NAME, handler);
  }, [enqueue]);

  const api = useMemo(
    () => ({
      notify: enqueue,
    }),
    [enqueue]
  );

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') return;
    setOpen(false);
  };

  const handleExited = () => {
    showNext();
  };

  return (
    <NotificationContext.Provider value={api}>
      {children}
      <Snackbar
        open={open}
        onClose={handleClose}
        onExited={handleExited}
        autoHideDuration={current?.autoHideDuration ?? 5000}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ mt: 8 }} // keep below TopBar/AppBar
      >
        <Alert
          onClose={handleClose}
          severity={current?.severity || 'info'}
          variant="filled"
          sx={{ minWidth: 320, boxShadow: 6 }}
        >
          {current?.message || ''}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return ctx;
}


