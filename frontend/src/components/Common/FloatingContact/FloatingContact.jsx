// frontend/src/components/Common/FloatingContact/FloatingContact.jsx
import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Phone, Mail, Send, X, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CONTACTS = [
  {
    label: 'WhatsApp',
    href: 'https://wa.me/254724167076',
    icon: MessageCircle,
    color: '#10b981',
    external: true,
    description: 'Quick chat'
  },
  {
    label: 'Call',
    href: 'tel:+254724167076',
    icon: Phone,
    color: '#3b82f6',
    description: 'Voice call'
  },
  {
    label: 'Telegram',
    href: 'https://t.me/yourusername',
    icon: Send,
    color: '#0ea5e9',
    external: true,
    description: 'Instant message'
  },
  {
    label: 'Email',
    href: 'mailto:delaircapital@gmail.com',
    icon: Mail,
    color: '#6b7280',
    description: 'Detailed inquiry'
  },
];

const FloatingContact = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showIdlePulse, setShowIdlePulse] = useState(false);
  const idleTimer = useRef(null);

  // Idle reminder after 30 seconds
  useEffect(() => {
    if (isOpen) {
      setShowIdlePulse(false);
      clearTimeout(idleTimer.current);
      return;
    }

    idleTimer.current = setTimeout(() => {
      setShowIdlePulse(true);
      
      // Auto-hide pulse after 5 seconds
      setTimeout(() => setShowIdlePulse(false), 5000);
    }, 30000);

    return () => clearTimeout(idleTimer.current);
  }, [isOpen]);

  const handleToggle = () => {
    setShowIdlePulse(false);
    clearTimeout(idleTimer.current);
    setIsOpen(!isOpen);
  };

  const ContactItem = ({ item, index }) => (
    <motion.a
      key={item.label}
      href={item.href}
      target={item.external ? '_blank' : undefined}
      rel={item.external ? 'noopener noreferrer' : undefined}
      onClick={() => setIsOpen(false)}
      initial={{ opacity: 0, x: 20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ 
        duration: 0.2,
        delay: index * 0.05,
        type: "spring",
        stiffness: 200
      }}
      whileHover={{ scale: 1.05, x: -2 }}
      whileTap={{ scale: 0.95 }}
      className="group flex items-center gap-3 px-4 py-3 rounded-xl 
                 text-white shadow-lg hover:shadow-xl
                 transition-all duration-200 backdrop-blur-sm 
                 border border-white/10 bg-gray-900/90"
      style={{ backgroundColor: `${item.color}20` }}
    >
      <div className="p-2 rounded-lg" style={{ backgroundColor: `${item.color}40` }}>
        <item.icon size={18} className="text-white" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{item.label}</div>
        <div className="text-xs opacity-80 truncate">{item.description}</div>
      </div>
      
      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="w-1 h-1 rounded-full bg-white" />
      </div>
    </motion.a>
  );

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="mb-3 flex flex-col items-end gap-2"
          >
            {CONTACTS.map((item, index) => (
              <ContactItem key={item.label} item={item} index={index} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Button */}
      <motion.button
        onClick={handleToggle}
        aria-label={isOpen ? "Close contact options" : "Open contact options"}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`
          relative w-14 h-14 rounded-2xl flex items-center justify-center
          shadow-xl transition-colors duration-200
          ${isOpen 
            ? 'bg-gradient-to-br from-primary-600 to-primary-800' 
            : 'bg-gradient-to-br from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800'
          }
        `}
      >
        {/* Idle Pulse Ring */}
        {showIdlePulse && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 rounded-2xl border-2 border-primary-400/30 animate-soft-pulse-ring"
          />
        )}

        {/* Icon */}
        {isOpen ? (
          <X size={20} className="text-white" />
        ) : (
          <MessageSquare size={20} className="text-white" />
        )}

        {/* Notification Dot */}
        {showIdlePulse && !isOpen && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-success-500 border-2 border-gray-950"
          />
        )}
      </motion.button>

      {/* Overlay to close */}
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