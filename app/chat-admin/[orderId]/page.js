'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

export default function ChatAdmin({ params }) {
  const { orderId } = params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  // Simuler un utilisateur admin
  useEffect(() => {
    setUser({
      id: 'admin-user',
      nom: 'Admin',
      prenom: 'Test',
      role: 'admin'
    });
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/chat-admin/${orderId}`);
      
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des messages');
      }
      
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Erreur fetchMessages:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || loading) return;

    const messageToSend = newMessage.trim();
    setError(null); // Effacer les erreurs précédentes

    try {
      setLoading(true);
      const response = await fetch(`/api/chat-admin/${orderId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageToSend,
          user_id: user.id,
          user_name: `${user.prenom} ${user.nom}`,
          user_role: user.role
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de l\'envoi du message');
      }

      // Vider le champ seulement après succès
      setNewMessage('');
      
      // Rafraîchir les messages après envoi réussi
      setTimeout(() => {
        fetchMessages();
      }, 100);
    } catch (err) {
      console.error('Erreur sendMessage:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchMessages();
      // Polling pour les nouveaux messages
      const interval = setInterval(fetchMessages, 2000);
      return () => clearInterval(interval);
    }
  }, [orderId]);

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-full mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h1 className="text-xl sm:text-2xl font-bold text-yellow-800 mb-2">💬 Chat Admin - Commande #{orderId}</h1>
            <p className="text-yellow-700 text-sm sm:text-base">Mode admin - Chat sans authentification</p>
          </div>

          {/* Messages */}
          <div className="bg-gray-50 rounded-lg p-4 h-96 overflow-y-auto mb-4">
            {loading && messages.length === 0 ? (
              <div className="text-center text-gray-500">Chargement des messages...</div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-500">Aucun message pour le moment</div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.user?.role === 'admin' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.user?.role === 'admin'
                          ? 'bg-blue-500 text-white'
                          : message.user?.role === 'delivery'
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      <div className="text-xs opacity-75 mb-1">
                        {message.user?.prenom} {message.user?.nom} ({message.user?.role})
                      </div>
                      <div>{message.message}</div>
                      <div className="text-xs opacity-75 mt-1">
                        {new Date(message.created_at).toLocaleTimeString('fr-FR')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Formulaire d'envoi */}
          <form onSubmit={sendMessage} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                setError(null); // Effacer les erreurs en tapant
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(e);
                }
              }}
              placeholder="Tapez votre message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={loading}
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={loading || !newMessage.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {loading ? 'Envoi...' : 'Envoyer'}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Bouton retour */}
          <div className="mt-6 text-center">
            <a
              href={`/track-order-admin`}
              className="inline-block px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              ← Retour au suivi de commande
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
