'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

// Widget Cloudflare Turnstile. Token dikirim ke server dan diverifikasi di sana.
const Turnstile = forwardRef(function Turnstile({ siteKey, onVerify, onExpire, onError }, ref) {
  const containerRef = useRef(null);
  const widgetRef = useRef(null);
  const callbacks = useRef({ onVerify, onExpire, onError });

  useEffect(() => {
    callbacks.current = { onVerify, onExpire, onError };
  }, [onVerify, onExpire, onError]);

  useEffect(() => {
    if (!siteKey) return undefined;
    let cancelled = false;

    const render = () => {
      if (cancelled || !containerRef.current || !window.turnstile) return;
      widgetRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        action: 'ticket',
        theme: 'light',
        size: 'flexible',
        retry: 'auto',
        'retry-interval': 8000,
        callback: (token) => callbacks.current.onVerify?.(token),
        'expired-callback': () => callbacks.current.onExpire?.(),
        'error-callback': (code) => callbacks.current.onError?.(code),
      });
    };

    if (window.turnstile) {
      render();
    } else {
      let script = document.querySelector('script[data-turnstile]');
      if (!script) {
        script = document.createElement('script');
        script.src = SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        script.dataset.turnstile = 'true';
        script.addEventListener('error', () => callbacks.current.onError?.('script-load'));
        document.head.appendChild(script);
      }
      script.addEventListener('load', render);
    }

    return () => {
      cancelled = true;
      if (widgetRef.current != null && window.turnstile) {
        try { window.turnstile.remove(widgetRef.current); } catch {}
      }
      widgetRef.current = null;
    };
  }, [siteKey]);

  useImperativeHandle(ref, () => ({
    reset() {
      if (widgetRef.current != null && window.turnstile) {
        try { window.turnstile.reset(widgetRef.current); } catch {}
      }
    },
  }), []);

  return <div ref={containerRef} className="turnstile" />;
});

export default Turnstile;
