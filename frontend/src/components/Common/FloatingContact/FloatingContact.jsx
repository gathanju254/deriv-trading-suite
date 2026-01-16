// frontend/src/components/Common/FloatingContact/FloatingContact.jsx
import React, { useEffect, useRef, useState } from 'react';
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
import { motion, AnimatePresence } from 'framer-motion';

const CONTACTS = [
  {
    label: 'WhatsApp',
    href: 'https://wa.me/254724167076',
    icon: MessageCircle,
    className: 'bg-gradient-to-br from-success-500 to-success-600 hover:from-success-600 hover:to-success-700',
    color: '#10b981',
    external: true,
    description: 'Quick chat'
  },
  {
    label: 'Call',
    href: 'tel:+254724167076',
    icon: Phone,
    className: 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
    color: '#3b82f6',
    description: 'Voice call'
  },
  {
    label: 'Telegram',
    href: 'https://t.me/yourusername',
    icon: Send,
    className: 'bg-gradient-to-br from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700',
    color: '#0ea5e9',
    external: true,
    description: 'Instant message'
  },
  {
    label: 'Email',
    href: 'mailto:delaircapital@gmail.com',
    icon: Mail,
    className: 'bg-gradient-to-br from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900',
    color: '#374151',
    description: 'Detailed inquiry'
  },
];

const hapticFeedback = (pattern = [20, 40, 20]) => {
  if (navigator.vibrate && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    navigator.vibrate(pattern);
  }
};

const FloatingContact = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [idlePulse, setIdlePulse] = useState(false);
  const [pulseCount, setPulseCount] = useState(0);
  const idleTimer = useRef(null);
  const pulseInterval = useRef(null);

  // Idle pulse after 30s of inactivity (3 pulses)
  useEffect(() => {
    if (isOpen) {
      setIdlePulse(false);
      clearTimeout(idleTimer.current);
      return;
    }

    idleTimer.current = setTimeout(() => {
      setIdlePulse(true);
      
      // Pulse 3 times with intervals
      let count = 0;
      pulseInterval.current = setInterval(() => {
        setPulseCount(prev => prev + 1);
        count++;
        if (count >= 3) {
          clearInterval(pulseInterval.current);
          setIdlePulse(false);
          setPulseCount(0);
        }
      }, 1000);
    }, 30000);

    return () => {
      clearTimeout(idleTimer.current);
      if (pulseInterval.current) {
        clearInterval(pulseInterval.current);
      }
    };
  }, [isOpen]);

  const handleToggle = () => {
    hapticFeedback([15, 25, 15]);
    setIdlePulse(false);
    setPulseCount(0);
    if (pulseInterval.current) {
      clearInterval(pulseInterval.current);
    }
    setIsOpen(!isOpen);
  };

  const handleContactClick = () => {
    hapticFeedback([30, 20]);
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 pointer-events-auto">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, staggerChildren: 0.1 }}
            className="mb-3 flex flex-col items-end gap-2"
          >
            {CONTACTS.map((item, index) => (
              <motion.a
                key={item.label}
                href={item.href}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noopener noreferrer' : undefined}
                onClick={handleContactClick}
                initial={{ opacity: 0, x: 20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.9 }}
                transition={{ 
                  duration: 0.2, 
                  delay: index * 0.05,
                  type: "spring",
                  stiffness: 200 
                }}
                whileHover={{ scale: 1.05, x: -5 }}
                whileTap={{ scale: 0.95 }}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                className={`
                  group relative flex items-center gap-3 px-4 py-3 
                  rounded-xl text-white shadow-2xl
                  transition-all duration-200
                  backdrop-blur-sm border border-white/10
                  ${item.className}
                `}
              >
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Icon with background */}
                <div className="relative z-10 p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                  <item.icon size={18} className="text-white" />
                </div>
                
                <div className="relative z-10 text-left">
                  <div className="text-sm font-semibold">{item.label}</div>
                  <div className="text-xs opacity-80 font-medium">{item.description}</div>
                </div>
                
                {/* Hover arrow */}
                <div className="relative z-10 ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Zap size={14} className="text-white" />
                </div>
              </motion.a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        onClick={handleToggle}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        aria-label={isOpen ? "Close contact options" : "Open contact options"}
        whileHover={{ scale: 1.1, rotate: isOpen ? 90 : 0 }}
        whileTap={{ scale: 0.9 }}
        className={`
          relative w-16 h-16 rounded-2xl
          flex items-center justify-center
          shadow-2xl
          transition-all duration-300
          group
          ${isOpen 
            ? 'bg-gradient-to-br from-primary-600 to-primary-800' 
            : 'bg-gradient-to-br from-primary-500 to-primary-700'
          }
        `}
      >
        {/* Idle pulse ring */}
        {idlePulse && pulseCount < 3 && (
          <div className="absolute inset-0 rounded-2xl">
            <div 
              className={`
                absolute inset-0 rounded-2xl border-2
                ${pulseCount % 2 === 0 ? 'border-primary-400/50' : 'border-primary-300/30'}
                animate-soft-pulse-ring
              `}
            />
          </div>
        )}

        {/* Floating sparkles effect when idle */}
        {idlePulse && !isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: [0, 1, 0], y: -10 }}
              transition={{ duration: 1, repeat: Infinity }}
              className="absolute -top-2 -right-2"
            >
              <Sparkles size={12} className="text-primary-300" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: [0, 1, 0], y: -8 }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
              className="absolute -top-1 -left-1"
            >
              <Sparkles size={10} className="text-primary-200" />
            </motion.div>
          </>
        )}

        {/* Main icon */}
        <div className="relative z-10">
          {isOpen ? (
            <X size={24} className="text-white" />
          ) : (
            <MessageSquare size={24} className="text-white" />
          )}
        </div>

        {/* Hover glow effect */}
        <div className={`
          absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-400/20 to-transparent
          opacity-0 group-hover:opacity-100 transition-opacity duration-300
        `} />

        {/* Notification badge */}
        {idlePulse && !isOpen && (
          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-success-500 animate-pulse" />
        )}

        {/* Tooltip */}
        {!isOpen && isHovering && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -top-12 right-0 px-3 py-2 rounded-lg bg-gray-900/90 backdrop-blur-sm border border-gray-800/50 text-xs text-white whitespace-nowrap shadow-xl"
          >
            <div className="font-medium">Need help?</div>
            <div className="opacity-80">Contact support</div>
          </motion.div>
        )}
      </motion.button>

      {/* Click anywhere to close overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 cursor-pointer"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default FloatingContact;