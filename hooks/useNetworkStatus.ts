import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook that tracks online/offline status and provides
 * a callback mechanism for when the connection is restored.
 */
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  // Listeners that fire when we transition from offline → online
  const [onReconnectCallbacks] = useState<Set<() => void>>(() => new Set());

  const registerOnReconnect = useCallback((cb: () => void) => {
    onReconnectCallbacks.add(cb);
    return () => { onReconnectCallbacks.delete(cb); };
  }, [onReconnectCallbacks]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Fire all reconnect callbacks
      if (!navigator.onLine) return; // double-check
      onReconnectCallbacks.forEach(cb => {
        try { cb(); } catch (e) { console.error('Reconnect callback error:', e); }
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onReconnectCallbacks]);

  return { isOnline, wasOffline, registerOnReconnect };
};
