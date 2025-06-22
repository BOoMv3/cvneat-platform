'use client';

import { useState, useEffect } from 'react';
import { safeLocalStorage } from '../../lib/localStorage';
import { requestNotificationPermission } from '../utils/notifications';

export default function NotificationPermission() {
    const [showBanner, setShowBanner] = useState(false);
    
    useEffect(() => {
        const orderId = safeLocalStorage.getItem('notificationOrderId');
        if (orderId && Notification.permission === 'default') {
            setShowBanner(true);
        }
    }, []);

    const handlePermissionRequest = async () => {
        const orderId = safeLocalStorage.getItem('notificationOrderId');
        if (orderId) {
            await requestNotificationPermission(orderId);
            setShowBanner(false);
        }
    };
    
    const handleDismiss = () => {
        safeLocalStorage.removeItem('notificationOrderId');
        setShowBanner(false);
    }

    if (!showBanner) {
        return null;
    }

    return (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-blue-500 text-white p-4 rounded-lg shadow-lg z-50">
            <p>Activez les notifications pour suivre votre commande !</p>
            <div className="flex justify-center gap-4 mt-2">
                <button onClick={handlePermissionRequest} className="bg-white text-blue-500 font-bold py-1 px-3 rounded">Activer</button>
                <button onClick={handleDismiss} className="bg-transparent border border-white py-1 px-3 rounded">Plus tard</button>
            </div>
        </div>
    );
}
