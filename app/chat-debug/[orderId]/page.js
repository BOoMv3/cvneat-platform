'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';

export default function ChatDebugPage({ params }) {
  const { orderId } = params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchUser();
    fetchMessages();
    
    // Polling pour les nouveaux messages
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [orderId]);

  const fetchUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      console.log('👤 Utilisateur connecté:', user?.email);
    } catch (error) {
      console.error('Erreur récupération utilisateur:', error);
      setError('Erreur de connexion');
    }
  };

  const fetchMessages = async () => {
    try {
      console.log('📡 Récupération messages pour commande:', orderId);
      const response = await fetch(`/api/chat-debug/${orderId}`);
      const data = await response.json();
      
      if (response.ok) {
        setMessages(data.messages || []);
        console.log('✅ Messages récupérés:', data.messages?.length || 0);
      } else {
        console.error('❌ Erreur récupération messages:', data);
        setError(`Erreur: ${data.error}`);
      }
    } catch (error) {
      console.error('❌ Erreur fetch messages:', error);
      setError(`Erreur de connexion: ${error.message}`);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    setLoading(true);
    setError('');
    try {
      console.log('📤 Envoi message:', newMessage);
      console.log('👤 User ID:', user.id);
      
      const response = await fetch(`/api/chat-debug/${orderId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: newMessage.trim(),
          user_id: user.id
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ Message envoyé avec succès');
        setNewMessage('');
        fetchMessages(); // Rafraîchir les messages
      } else {
        console.error('❌ Erreur envoi message:', data);
        setError(`Erreur envoi: ${data.error} - ${data.details || ''}`);
      }
    } catch (error) {
      console.error('❌ Erreur envoi message:', error);
      setError(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Connexion requise</h1>
          <p className="text-gray-600">Veuillez vous connecter pour accéder au chat</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm">
          {/* Header */}
          <div className="border-b p-4 bg-yellow-50">
            <h1 className="text-xl font-bold text-yellow-800">🔧 Chat Debug - Commande #{orderId}</h1>
            <p className="text-sm text-yellow-700">Mode debug - Pas de restrictions RLS</p>
            <p className="text-xs text-yellow-600">Utilisateur: {user.email}</p>
          </div>

          {/* Messages */}
          <div className="h-96 overflow-y-auto p-4 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}
            
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>Aucun message pour le moment</p>
                <p className="text-sm">Commencez la conversation !</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.user_id === user.id ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.user_id === user.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-900'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs font-medium">
                        {message.user?.prenom} {message.user?.nom}
                      </span>
                      <span className="text-xs opacity-75">
                        {formatTime(message.created_at)}
                      </span>
                    </div>
                    <p className="text-sm">{message.message}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-4">
            <form onSubmit={sendMessage} className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Tapez votre message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !newMessage.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Envoi...' : 'Envoyer'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
