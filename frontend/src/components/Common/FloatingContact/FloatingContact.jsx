// frontend/src/components/Common/FloatingContact/FloatingContact.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  MessageCircle,
  Phone,
  Mail,
  Send,
  X,
  MessageSquare,
  Zap,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

const CONTACTS = [
  {
    label: 'WhatsApp',
    href: 'https://wa.me/254724167076',
    icon: MessageCircle,
    className:
      'bg-gradient-to-br from-success-500 to-success-600 hover:from-success-600 hover:to-success-700',
    description: 'Quick chat',
    external: true,
  },
  {
    label: 'Call',
    href: 'tel:+254724167076',
    icon: Phone,
    className:
      'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
    description: 'Voice call',
  },
  {
    label: 'Telegram',
    href: 'https://t.me/Derivi-trading-suite',
    icon: Send,
    className:
      'bg-gradient-to-br from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700',
    description: 'Instant message',
    external: true,
  },
  {
    label: 'Email',
    href: 'mailto:delaircapital@gmail.com',
    icon: Mail,
    className:
      'bg-gradient-to-br from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900',
    description: 'Detailed inquiry',
  },
];

const vibrate = (pattern = [20]) => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* noop */
  }
};

const FloatingContact = () => {
  const [open, setOpen] = useState(false);
  const [idlePulse, setIdlePulse] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const idleTimerRef = useRef(null);
  const pulseTimerRef = useRef(null);

  const clearTimers = useCallback(() => {
    clearTimeout(idleTimerRef.current);
    clearInterval(pulseTimerRef.current);
    idleTimerRef.current = null;
    pulseTimerRef.current = null;
  }, []);

  // Idle attention pulse (30s)
  useEffect(() => {
    if (open) {
      clearTimers();
      setIdlePulse(false);
      return;
    }

    idleTimerRef.current = setTimeout(() => {
      if (prefersReducedMotion) return;

      setIdlePulse(true);
      let pulses = 0;

      pulseTimerRef.current = setInterval(() => {
        pulses += 1;
        if (pulses >= 3) {
          clearTimers();
          setIdlePulse(false);
        }
      }, 1000);
    }, 30000);

    return clearTimers;
  }, [open, prefersReducedMotion, clearTimers]);

  // ESC key closes
  useEffect(() => {
    if (!open) return;

    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const toggle = () => {
    vibrate([15, 25, 15]);
    clearTimers();
    setIdlePulse(false);
    setOpen((v) => !v);
  };

  const handleContactClick = () => {
    vibrate([30, 20]);
    setOpen(false);
  };

  return (
    <>
      {/* Backdrop – BELOW button, ABOVE app */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className="fixed bottom-6 right-6 z-50 pointer-events-auto">
        <AnimatePresence>
          {open && (
            <motion.div
              className="mb-3 flex flex-col items-end gap-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
            >
              {CONTACTS.map((item, i) => (
                <motion.a
                  key={item.label}
                  href={item.href}
                  target={item.external ? '_blank' : undefined}
                  rel={item.external ? 'noopener noreferrer' : undefined}
                  onClick={handleContactClick}
                  whileHover={{ scale: 1.05, x: -6 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, type: 'spring', stiffness: 220 }}
                  className={`
                    group flex items-center gap-3 px-4 py-3
                    rounded-xl text-white shadow-2xl
                    backdrop-blur-sm border border-white/10
                    ${item.className}
                  `}
                >
                  <div className="p-2 rounded-lg bg-white/20">
                    <item.icon size={18} />
                  </div>

                  <div>
                    <div className="text-sm font-semibold">{item.label}</div>
                    <div className="text-xs opacity-80">{item.description}</div>
                  </div>

                  <Zap
                    size={14}
                    className="ml-2 opacity-0 group-hover:opacity-100 transition"
                  />
                </motion.a>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle Button */}
        <motion.button
          onClick={toggle}
          aria-expanded={open}
          aria-label="Contact support"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className={`
            relative w-16 h-16 rounded-2xl
            flex items-center justify-center
            shadow-2xl
            bg-gradient-to-br
            ${open
              ? 'from-primary-600 to-primary-800'
              : 'from-primary-500 to-primary-700'}
          `}
        >
          {idlePulse && !open && !prefersReducedMotion && (
            <div className="absolute inset-0 rounded-2xl border border-primary-400/40 animate-soft-pulse-ring" />
          )}

          {open ? <X size={24} /> : <MessageSquare size={24} />}

          {idlePulse && !open && (
            <Sparkles
              size={12}
              className="absolute -top-2 -right-2 text-primary-300 animate-pulse"
            />
          )}
        </motion.button>
      </div>
    </>
  );
};

export default FloatingContact;
