// frontend/src/components/Common/FloatingContact/FloatingContact.jsx
import React, { useEffect, useRef, useState } from 'react';
import {
  MessageCircle,
  Phone,
  Mail,
  Send,
  X
} from 'lucide-react';

const CONTACTS = [
  {
    label: 'WhatsApp',
    href: 'https://wa.me/254724167076',
    icon: MessageCircle,
    className: 'bg-success hover:bg-success/90',
    external: true,
  },
  {
    label: 'Call',
    href: 'tel:+254724167076',
    icon: Phone,
    className: 'bg-info hover:bg-info/90',
  },
  {
    label: 'Telegram',
    href: 'https://t.me/yourusername',
    icon: Send,
    className: 'bg-sky-500 hover:bg-sky-500/90',
    external: true,
  },
  {
    label: 'Email',
    href: 'mailto:delaircapital@gmail.com',
    icon: Mail,
    className: 'bg-gray-700 hover:bg-gray-600',
  },
];

const haptic = (pattern = 20) => {
  if (navigator.vibrate) navigator.vibrate(pattern);
};

const FloatingContact = () => {
  const [open, setOpen] = useState(false);
  const [idlePulse, setIdlePulse] = useState(false);
  const idleTimer = useRef(null);

  // Idle pulse after 20s of inactivity
  useEffect(() => {
    if (open) {
      setIdlePulse(false);
      clearTimeout(idleTimer.current);
      return;
    }

    idleTimer.current = setTimeout(() => {
      setIdlePulse(true);
    }, 20000);

    return () => clearTimeout(idleTimer.current);
  }, [open]);

  const toggle = () => {
    haptic(15);
    setIdlePulse(false);
    setOpen((v) => !v);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 pointer-events-auto">
      {/* Action Buttons */}
      {open && (
        <div className="mb-3 flex flex-col items-end gap-3">
          {CONTACTS.map((item, index) => {
            const Icon = item.icon;

            return (
              <a
                key={item.label}
                href={item.href}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noopener noreferrer' : undefined}
                onClick={() => haptic(30)}
                style={{
                  animationDelay: `${index * 60}ms`,
                }}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg
                  text-white shadow-lg
                  transition-all duration-200
                  hover:scale-105
                  animate-fade-slide-in
                  ${item.className}
                `}
              >
                <Icon size={18} />
                <span className="text-sm font-medium">{item.label}</span>
              </a>
            );
          })}
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={toggle}
        aria-label="Contact options"
        className={`
          relative w-14 h-14 rounded-full
          bg-primary text-white
          flex items-center justify-center
          shadow-2xl
          transition-all duration-300
          hover:scale-110
          ${idlePulse && !open ? 'animate-soft-pulse' : ''}
        `}
      >
        {open ? <X /> : <MessageCircle />}
      </button>
    </div>
  );
};

export default FloatingContact;
