// frontend/src/components/Common/FloatingContact/FloatingContact.jsx
import React, { useState } from 'react';
import {
  MessageCircle,
  Phone,
  Mail,
  Send,
  X
} from 'lucide-react';

const FloatingContact = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Action Buttons */}
      {open && (
        <div className="mb-3 flex flex-col items-end gap-3 animate-fade-in">
          <a
            href="https://wa.me/2547XXXXXXXX"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white shadow-lg hover:scale-105 transition"
          >
            <MessageCircle size={18} /> WhatsApp
          </a>

          <a
            href="tel:+2547XXXXXXXX"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white shadow-lg hover:scale-105 transition"
          >
            <Phone size={18} /> Call
          </a>

          <a
            href="https://t.me/yourusername"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 text-white shadow-lg hover:scale-105 transition"
          >
            <Send size={18} /> Telegram
          </a>

          <a
            href="mailto:support@derivtradingsuite.com"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 text-white shadow-lg hover:scale-105 transition"
          >
            <Mail size={18} /> Email
          </a>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setOpen(!open)}
        className="
          w-14 h-14 rounded-full
          bg-primary text-white
          flex items-center justify-center
          shadow-2xl
          hover:scale-110
          transition-all
        "
        aria-label="Contact options"
      >
        {open ? <X /> : <MessageCircle />}
      </button>
    </div>
  );
};

export default FloatingContact;
