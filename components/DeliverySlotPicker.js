'use client';

import { useEffect, useState } from 'react';
import { FaClock } from 'react-icons/fa';
import { generateDeliverySlotOptions } from '@/lib/delivery-slots';

export default function DeliverySlotPicker({ value, onChange, disabled = false }) {
  const [slots, setSlots] = useState(() => generateDeliverySlotOptions());

  useEffect(() => {
    setSlots(generateDeliverySlotOptions());
    const t = setInterval(() => setSlots(generateDeliverySlotOptions()), 60_000);
    return () => clearInterval(t);
  }, []);

  const selectedId = value?.id || 'asap';

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
        <FaClock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        Créneau de livraison souhaité
      </h3>
      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
        Choisissez une fourchette de 30 minutes. Le restaurant confirmera si c&apos;est possible (sinon livraison au plus tôt).
      </p>
      <div className="space-y-2">
        {slots.map((slot) => (
          <label
            key={slot.id}
            className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors touch-manipulation ${
              selectedId === slot.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-600'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            } ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
          >
            <input
              type="radio"
              name="delivery-slot"
              className="mt-1"
              checked={selectedId === slot.id}
              disabled={disabled}
              onChange={() =>
                onChange({
                  id: slot.id,
                  type: slot.type,
                  start: slot.start,
                  end: slot.end,
                })
              }
            />
            <span className="flex-1">
              <span className="block text-sm font-semibold text-gray-900 dark:text-white">{slot.label}</span>
              {slot.description && (
                <span className="block text-xs text-gray-600 dark:text-gray-400 mt-0.5">{slot.description}</span>
              )}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
