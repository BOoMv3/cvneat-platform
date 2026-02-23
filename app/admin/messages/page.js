'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { FaArrowLeft, FaComments, FaPaperPlane, FaUsers, FaStore, FaSpinner } from 'react-icons/fa';

export default function AdminMessagesPage() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState([]);
  const [sentMessages, setSentMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState('all');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const { data: u } = await supabase.from('users').select('role').eq('id', user.id).single();
      if (!u || u.role !== 'admin') {
        router.push('/login');
        return;
      }
      const [restoRes, msgRes] = await Promise.all([
        supabase.from('restaurants').select('id, nom').order('nom'),
        supabase.from('partner_messages').select('id, subject, created_at, restaurant_id').order('created_at', { ascending: false }).limit(50),
      ]);
      setRestaurants(restoRes.data || []);
      setSentMessages(msgRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!subject.trim() || !body.trim()) {
      setError('Sujet et message requis');
      return;
    }
    if (targetType === 'one' && !selectedRestaurantId) {
      setError('Sélectionnez un restaurant');
      return;
    }
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          restaurantId: targetType === 'one' ? selectedRestaurantId : null,
          subject: subject.trim(),
          body: body.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Erreur envoi');
      setSuccess(`Message envoyé ${targetType === 'all' ? 'à tous les partenaires' : 'au restaurant sélectionné'}`);
      setSubject('');
      setBody('');
      checkAuthAndFetch();
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  const getRestaurantName = (id) => restaurants.find((r) => r.id === id)?.nom || '—';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <FaSpinner className="animate-spin h-10 w-10 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => router.push('/admin')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <FaArrowLeft />
          Retour
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-blue-100 rounded-xl">
            <FaComments className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Messagerie partenaires</h1>
            <p className="text-sm text-gray-500">Envoyez un message à tous les partenaires ou à un restaurant en particulier</p>
          </div>
        </div>

        <form onSubmit={handleSend} className="bg-white rounded-xl shadow-sm border p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-900">Nouveau message</h2>
            <button
              type="button"
              onClick={() => {
                setSubject('Bienvenue sur la messagerie CVN\'EAT — Nouvelle stratégie & mises à jour');
                setBody(`Bonjour à tous,

Ce message vous explique deux choses importantes :

1️⃣ LE MESSAGE ROUGE SUR VOTRE DASHBOARD
Quand vous allumez votre tablette et ouvrez CVN'EAT, vous verrez un bloc rouge en haut du tableau de bord. Il présente notre nouvelle stratégie commerciale :
• CVN'EAT baisse sa commission à 15% (au lieu de 20%)
• En échange : prix comme en boutique ou +5 à 7% max sur vos articles
• Exemple : tacos 10€ en boutique → affichez 10€ ou max 10,50€ (+5%). Commission 15% : vous gardez 8,50€ à 8,93€ selon le cas
• Objectif : booster le volume de commandes pour tout le monde

Si vous acceptez, l'admin configurera la réduction adaptée à votre situation. Certains d'entre vous avaient déjà des prix proches du prix boutique — aucune action nécessaire pour eux.

2️⃣ LA MESSAGERIE CVN'EAT (ICI)
La section "Messagerie CVN'EAT" sur votre dashboard, c'est ici que nous vous transmettrons :
• Les infos sur les mises à jour de la plateforme
• Les documents importants
• Les annonces et rappels

Pensez à consulter régulièrement cette messagerie. Les nouveaux messages non lus apparaissent avec un badge rouge.

À très vite,
L'équipe CVN'EAT`);
              }}
              className="text-sm px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200"
            >
              📋 Message d'accueil (stratégie + messagerie)
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destinataire</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={targetType === 'all'}
                    onChange={() => setTargetType('all')}
                    className="rounded"
                  />
                  <FaUsers className="text-blue-500" />
                  Tous les partenaires
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={targetType === 'one'}
                    onChange={() => setTargetType('one')}
                    className="rounded"
                  />
                  <FaStore className="text-amber-500" />
                  Un partenaire
                </label>
              </div>
              {targetType === 'one' && (
                <select
                  value={selectedRestaurantId}
                  onChange={(e) => setSelectedRestaurantId(e.target.value)}
                  className="mt-2 w-full max-w-md px-3 py-2 border rounded-lg"
                >
                  <option value="">— Choisir un restaurant —</option>
                  {restaurants.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nom}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sujet</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex: Mise à jour des horaires"
                className="w-full px-3 py-2 border rounded-lg"
                maxLength={200}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Votre message..."
                rows={5}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}
            <button
              type="submit"
              disabled={sending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
            >
              {sending ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
              Envoyer
            </button>
          </div>
        </form>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Messages envoyés</h2>
          {sentMessages.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun message envoyé</p>
          ) : (
            <ul className="space-y-2">
              {sentMessages.map((m) => (
                <li key={m.id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <span className="font-medium">{m.subject || '(sans sujet)'}</span>
                    <span className="ml-2 text-xs text-gray-500">
                      {m.restaurant_id ? getRestaurantName(m.restaurant_id) : 'Tous'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(m.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
