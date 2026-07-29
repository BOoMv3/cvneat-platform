'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { FaArrowLeft, FaPaperPlane, FaSpinner, FaMotorcycle, FaUsers } from 'react-icons/fa';

export default function AdminDeliveryMessagesPage() {
  const router = useRouter();
  const [livreurs, setLivreurs] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState('all');
  const [selectedId, setSelectedId] = useState('');
  const [template, setTemplate] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    (async () => {
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

      const { data: list } = await supabase
        .from('users')
        .select('id, prenom, nom, email')
        .in('role', ['delivery', 'livreur'])
        .order('prenom');
      setLivreurs(list || []);

      const { data: msgs } = await supabase
        .from('delivery_messages')
        .select('id, subject, created_at, delivery_user_id, kind, event_type')
        .order('created_at', { ascending: false })
        .limit(40);
      setSent(msgs || []);
      setLoading(false);
    })();
  }, [router]);

  useEffect(() => {
    if (template === 'missing_docs') {
      setSubject('Documents manquants pour votre compte livreur');
      setBody(
        `Bonjour,\n\nIl manque des informations / documents sur votre compte livreur CVN'EAT (SIRET, raison sociale ou pièce justificative).\n\nMerci de les renseigner dans l'app : Profil → Infos facturation, puis de nous prévenir.\n\nSans ces infos, vos factures de paiement seront incomplètes.\n\nL'équipe CVN'EAT`
      );
    } else if (template === 'welcome') {
      setSubject("Bienvenue dans l'équipe livreurs CVN'EAT");
      setBody(
        `Bonjour,\n\nBienvenue ! Pense à compléter ton profil (SIRET / raison sociale) pour que tes factures de paiement soient correctes.\n\nTu peux aussi utiliser la messagerie dans l'app pour échanger avec l'équipe et les autres livreurs.\n\nÀ bientôt sur la route,\nL'équipe CVN'EAT`
      );
    }
  }, [template]);

  const handleSend = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!subject.trim() || !body.trim()) {
      setError('Sujet et message requis');
      return;
    }
    if (targetType === 'one' && !selectedId) {
      setError('Choisis un livreur');
      return;
    }
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/delivery-messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          deliveryUserId: targetType === 'one' ? selectedId : null,
          subject: subject.trim(),
          body: body.trim(),
          kind: template === 'missing_docs' ? 'system' : 'admin',
          eventType: template === 'missing_docs' ? 'missing_docs' : 'admin_message',
          push: true,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Erreur envoi');
      setSuccess(targetType === 'all' ? 'Message envoyé à tous les livreurs' : 'Message envoyé');
      setSubject('');
      setBody('');
      setTemplate('');
      const { data: msgs } = await supabase
        .from('delivery_messages')
        .select('id, subject, created_at, delivery_user_id, kind, event_type')
        .order('created_at', { ascending: false })
        .limit(40);
      setSent(msgs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const nameOf = (id) => {
    const l = livreurs.find((x) => x.id === id);
    if (!l) return 'Tous';
    return `${l.prenom || ''} ${l.nom || ''}`.trim() || l.email;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FaSpinner className="animate-spin h-8 w-8 text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button
          type="button"
          onClick={() => router.push('/admin')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <FaArrowLeft /> Retour
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-orange-100 rounded-xl">
            <FaMotorcycle className="h-7 w-7 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Messages livreurs</h1>
            <p className="text-sm text-gray-500">Envoi à un livreur ou à toute l’équipe + push</p>
          </div>
        </div>

        <form onSubmit={handleSend} className="bg-white rounded-xl border shadow-sm p-6 mb-8 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Modèle rapide</label>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">— Aucun —</option>
              <option value="welcome">Bienvenue</option>
              <option value="missing_docs">Documents / SIRET manquants</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Destinataire</label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2">
                <input type="radio" checked={targetType === 'all'} onChange={() => setTargetType('all')} />
                <FaUsers className="text-orange-500" /> Tous les livreurs
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={targetType === 'one'} onChange={() => setTargetType('one')} />
                Un livreur
              </label>
            </div>
            {targetType === 'one' && (
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="mt-2 w-full border rounded-lg px-3 py-2"
              >
                <option value="">— Choisir —</option>
                {livreurs.map((l) => (
                  <option key={l.id} value={l.id}>
                    {`${l.prenom || ''} ${l.nom || ''}`.trim() || l.email} ({l.email})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Sujet</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              maxLength={200}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}

          <button
            type="submit"
            disabled={sending}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-60"
          >
            {sending ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
            Envoyer + notifier
          </button>
        </form>

        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h2 className="font-semibold mb-4">Derniers messages</h2>
          {sent.length === 0 ? (
            <p className="text-sm text-gray-500">
              Aucun message (applique la migration SQL si la table n’existe pas encore).
            </p>
          ) : (
            <ul className="space-y-2">
              {sent.map((m) => (
                <li key={m.id} className="flex justify-between border-b py-2 text-sm">
                  <div>
                    <span className="font-medium">{m.subject}</span>
                    <span className="text-gray-500 ml-2">
                      {m.delivery_user_id ? nameOf(m.delivery_user_id) : 'Tous'}
                      {m.event_type ? ` · ${m.event_type}` : ''}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(m.created_at).toLocaleString('fr-FR')}
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
