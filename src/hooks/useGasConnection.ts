import { useState, useEffect } from 'react';
import { APP_CONFIG } from '../config';

// Global state to avoid multiple pings and rate-limits when multiple components mount
let isConnectedCache = false;
let lastPingTime = 0;
const PING_INTERVAL = 30000; // 30 seconds
let isPinging = false;

export const useGasConnection = () => {
  const [isConnected, setIsConnected] = useState(isConnectedCache);
  const [isChecking, setIsChecking] = useState(isPinging);

  useEffect(() => {
    let mounted = true;
    
    const checkConnection = async () => {
      // Don't ping if no URL is set
      if (!APP_CONFIG.gasConfig.webAppUrl || APP_CONFIG.gasConfig.webAppUrl.trim().length < 10) {
        isConnectedCache = false;
        if (mounted) setIsConnected(false);
        return;
      }

      if (!navigator.onLine) {
        isConnectedCache = false;
        if (mounted) setIsConnected(false);
        return;
      }

      const now = Date.now();
      // Debounce if another component just pinged recently (within 10 seconds)
      if (now - lastPingTime < 10000 || isPinging) {
        if (mounted) {
          setIsConnected(isConnectedCache);
          setIsChecking(isPinging);
        }
        return;
      }
      
      isPinging = true;
      if (mounted) setIsChecking(true);
      try {
        const response = await fetch(APP_CONFIG.gasConfig.webAppUrl, { 
          method: 'GET',
          redirect: 'follow'
        });
        
        if (response.ok) {
          isConnectedCache = true;
        } else {
          isConnectedCache = false;
        }
      } catch (error) {
        isConnectedCache = false;
      } finally {
        isPinging = false;
        lastPingTime = Date.now();
        if (mounted) setIsChecking(false);
      }
      
      if (mounted) {
        setIsConnected(isConnectedCache);
      }
    };

    // Initial check
    checkConnection();
    
    // Set interval
    const interval = setInterval(checkConnection, PING_INTERVAL);
    
    // Also listen to window focus & online events to recheck aggressively
    const handleFocus = () => checkConnection();
    const handleOnline = () => checkConnection();
    const handleOffline = () => {
      isConnectedCache = false;
      if (mounted) setIsConnected(false);
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isConnected, isChecking };
};
