'use client';
import { useState, useEffect, useRef } from 'react';
import { FaComments, FaTimes, FaPaperPlane, FaUser, FaTruck } from 'react-icons/fa';

export default function DeliveryChat({ orderId, customerName, isOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && orderId) {
      fetchMessages();
    }
  }, [isOpen, orderId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/delivery/messages/${orderId}`);
      const data = await response.json();
      
      if (response.ok) {
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Erreur récupération messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageData = {
      order_id: orderId,
      message: newMessage.trim(),
      sender_type: 'delivery'
    };

    try {
      const response = await fetch('/api/delivery/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageData)
      });

      if (response.ok) {
        const sentMessage = await response.json();
        setMessages(prev => [...prev, sentMessage]);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Erreur envoi message:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md h-96 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-3">
            <FaComments className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Chat avec le client</h3>
              <p className="text-sm text-gray-600">{customerName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FaTimes className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <FaComments className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>Aucun message pour le moment</p>
              <p className="text-sm">Commencez la conversation</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender_type === 'delivery' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg ${
                    message.sender_type === 'delivery'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    {message.sender_type === 'delivery' ? (
                      <FaTruck className="h-3 w-3" />
                    ) : (
                      <FaUser className="h-3 w-3" />
                    )}
                    <span className="text-xs opacity-75">
                      {message.sender_type === 'delivery' ? 'Vous' : 'Client'}
                    </span>
                  </div>
                  <p className="text-sm">{message.message}</p>
                  <p className="text-xs opacity-75 mt-1">
                    {new Date(message.created_at).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} className="p-4 border-t">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Tapez votre message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaPaperPlane className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 