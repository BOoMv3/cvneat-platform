'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import {
  FaArrowLeft,
  FaPaperPlane,
  FaSpinner,
  FaMotorcycle,
  FaUsers,
  FaComments,
  FaInbox,
} from 'react-icons/fa';

export default function AdminDeliveryMessagesPage() {
  const router = useRouter();
  const [tab, setTab] = useState('broadcast');
  const [token, setToken] = useState(null);
  const [meId, setMeId] = useState(null);
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

  // Chat
  const [threads, setThreads] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [dmMessages, setDmMessages] = useState([]);
  const [dmBody, setDmBody] = useState('');

  const headers = useCallback(
    () => ({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }),
    [token]
  );

  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      const { data: u } = await supabase.from('users').select('role').eq('id', session.user.id).single();
      if (!u || u.role !== 'admin') {
        router.push('/login');
        return;
      }
      setToken(session.access_token);
      setMeId(session.user.id);

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
        `Bonjour,\n\nIl manque des infos facturation sur ton compte livreur CVN'EAT (raison sociale, SIRET et/ou KBIS).\n\nMerci de les renseigner dans l'app : Profil → SIRET / KBIS (factures).\n\nSans ces infos, tes factures de paiement seront incomplètes.\n\nL'équipe CVN'EAT`
      );
    } else if (template === 'welcome') {
      setSubject("Bienvenue dans l'équipe livreurs CVN'EAT");
      setBody(
        `Bonjour,\n\nBienvenue ! Pense à compléter ton profil (SIRET, raison sociale + KBIS) dans Profil → SIRET / KBIS, et utilise Factures pour télécharger tes paiements.\n\nTu peux aussi utiliser la messagerie pour écrire au support.\n\nÀ bientôt sur la route,\nL'équipe CVN'EAT`
      );
    }
  }, [template]);

  const loadChat = useCallback(async () => {
    if (!token) return;
    const [tRes, dRes] = await Promise.all([
      fetch('/api/delivery/dm/threads', { headers: headers() }),
      fetch('/api/delivery/directory', { headers: headers() }),
    ]);
    const tJson = await tRes.json().catch(() => ({}));
    const dJson = await dRes.json().catch(() => ({}));
    if (tRes.ok) setThreads(tJson.threads || []);
    // Admin: directory = livreurs only for starting chats
    setDirectory(dJson.livreurs || (dJson.contacts || []).filter((c) => c.kind === 'delivery'));
  }, [token, headers]);

  useEffect(() => {
    if (tab === 'chat' && token) loadChat().catch((e) => setError(e.message));
  }, [tab, token, loadChat]);

  const loadDm = async (threadId) => {
    const res = await fetch(`/api/delivery/dm/${threadId}/messages`, { headers: headers() });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Erreur messages');
    setDmMessages(json.messages || []);
  };

  useEffect(() => {
    if (tab === 'chat' && activeThreadId) {
      loadDm(activeThreadId).catch((e) => setError(e.message));
    }
  }, [tab, activeThreadId]);

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
      const res = await fetch('/api/admin/delivery-messages/send', {
        method: 'POST',
        headers: headers(),
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
      const push = json.push;
      let pushInfo = '';
      if (push) {
        if (push.total === 0) {
          pushInfo =
            ' — ⚠️ aucune notif app : les livreurs n’ont pas de token appareil (ouvrir l’app livreur + autoriser les notifs).';
        } else {
          pushInfo = ` — push app : ${push.sent}/${push.total} appareil(s)`;
          if (push.web) pushInfo += ' + web';
        }
      }
      setSuccess(
        (targetType === 'all' ? 'Message envoyé à tous les livreurs' : 'Message envoyé') + pushInfo
      );
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

  const startDm = async (peerId) => {
    setSending(true);
    try {
      const res = await fetch('/api/delivery/dm/threads', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ peerId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Erreur');
      setActiveThreadId(json.thread.id);
      await loadChat();
      await loadDm(json.thread.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  const sendDm = async (e) => {
    e.preventDefault();
    if (!activeThreadId || !dmBody.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/delivery/dm/${activeThreadId}/messages`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ body: dmBody.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Erreur envoi');
      setDmBody('');
      await loadDm(activeThreadId);
      await loadChat();
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

  const activeThread = threads.find((t) => t.id === activeThreadId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FaSpinner className="animate-spin h-8 w-8 text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
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
            <h1 className="text-2xl font-bold text-gray-900">Messages & chat livreurs</h1>
            <p className="text-sm text-gray-500">
              Annonces = boîte du livreur · Chat live = discussion directe (aussi visible en Annonces)
            </p>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setTab('broadcast')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
              tab === 'broadcast' ? 'bg-orange-500 text-white' : 'bg-white border text-gray-700'
            }`}
          >
            <FaInbox /> Annonces
          </button>
          <button
            type="button"
            onClick={() => setTab('chat')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
              tab === 'chat' ? 'bg-orange-500 text-white' : 'bg-white border text-gray-700'
            }`}
          >
            <FaComments /> Chat live
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
            {success}
          </div>
        )}

        {tab === 'broadcast' ? (
          <>
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
              <h2 className="font-semibold mb-4">Dernières annonces</h2>
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
          </>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b font-medium">Conversations</div>
              <div className="max-h-[40vh] overflow-y-auto divide-y">
                {threads.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveThreadId(t.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-orange-50 ${
                      activeThreadId === t.id ? 'bg-orange-50' : ''
                    }`}
                  >
                    <div className="text-sm font-medium">{t.peer?.name}</div>
                    <p className="text-xs text-gray-500 truncate">{t.last_message?.body || '—'}</p>
                  </button>
                ))}
                {threads.length === 0 && (
                  <p className="p-3 text-xs text-gray-500">Aucune conversation.</p>
                )}
              </div>
              <div className="border-t px-3 py-2">
                <p className="text-xs font-medium text-gray-600 mb-2">Écrire à un livreur</p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {directory.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      disabled={sending}
                      onClick={() => startDm(l.id)}
                      className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-gray-100"
                    >
                      {l.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border shadow-sm md:col-span-2 flex flex-col min-h-[420px]">
              <div className="px-4 py-3 border-b font-medium">
                {activeThread ? activeThread.peer?.name : 'Choisis une conversation'}
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[50vh]">
                {dmMessages.map((m) => {
                  const mine = m.sender_id === meId;
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                          mine ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.body}</p>
                        <p className={`text-[10px] mt-1 ${mine ? 'text-orange-100' : 'text-gray-500'}`}>
                          {new Date(m.created_at).toLocaleString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {activeThreadId && (
                <form onSubmit={sendDm} className="border-t p-3 flex gap-2">
                  <input
                    value={dmBody}
                    onChange={(e) => setDmBody(e.target.value)}
                    placeholder="Répondre au livreur…"
                    className="flex-1 border rounded-lg px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={sending || !dmBody.trim()}
                    className="bg-orange-500 text-white px-4 py-2 rounded-lg disabled:opacity-50 flex items-center gap-2"
                  >
                    <FaPaperPlane /> Envoyer
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
