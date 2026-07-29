'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import DeliveryNavbar from '../../components/DeliveryNavbar';
import { FaComments, FaPaperPlane, FaInbox, FaUsers, FaSpinner, FaCheckDouble } from 'react-icons/fa';

export default function DeliveryMessagesPage() {
  const router = useRouter();
  const [tab, setTab] = useState('inbox');
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inbox, setInbox] = useState([]);
  const [unreadInbox, setUnreadInbox] = useState(0);
  const [threads, setThreads] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [dmMessages, setDmMessages] = useState([]);
  const [dmBody, setDmBody] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedInbox, setSelectedInbox] = useState(null);
  const [error, setError] = useState(null);
  const [meId, setMeId] = useState(null);
  const [tabFromUrl, setTabFromUrl] = useState(false);

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }), [token]);

  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      if (q.get('tab') === 'dm') {
        setTab('dm');
        setTabFromUrl(true);
      }
      if (q.get('thread')) setActiveThreadId(q.get('thread'));
    } catch {
      /* ignore */
    }
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }
      setToken(session.access_token);
      setMeId(session.user.id);
    })();
  }, [router]);

  const loadInbox = useCallback(async () => {
    if (!token) return;
    const res = await fetch('/api/delivery/inbox', { headers: authHeaders() });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Erreur inbox');
    setInbox(json.messages || []);
    setUnreadInbox(json.unread || 0);
  }, [token, authHeaders]);

  const loadThreads = useCallback(async () => {
    if (!token) return;
    const [tRes, dRes] = await Promise.all([
      fetch('/api/delivery/dm/threads', { headers: authHeaders() }),
      fetch('/api/delivery/directory', { headers: authHeaders() }),
    ]);
    const tJson = await tRes.json().catch(() => ({}));
    const dJson = await dRes.json().catch(() => ({}));
    if (!tRes.ok) throw new Error(tJson.error || 'Erreur conversations');
    setThreads(tJson.threads || []);
    setDirectory(dJson.contacts || dJson.livreurs || []);
    return tJson.threads || [];
  }, [token, authHeaders]);

  const loadDmMessages = useCallback(async (threadId) => {
    if (!token || !threadId) return;
    const res = await fetch(`/api/delivery/dm/${threadId}/messages`, { headers: authHeaders() });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Erreur messages');
    setDmMessages(json.messages || []);
  }, [token, authHeaders]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [, loadedThreads] = await Promise.all([loadInbox(), loadThreads()]);
        // Si unread chat support et pas d’onglet imposé par l’URL → ouvrir Discussions
        if (!tabFromUrl && Array.isArray(loadedThreads)) {
          const unreadSupport = loadedThreads.find(
            (t) => t.unread > 0 && (t.peer?.kind === 'admin' || String(t.peer?.name || '').includes("Support"))
          );
          const anyUnread = loadedThreads.find((t) => t.unread > 0);
          if (unreadSupport || anyUnread) {
            setTab('dm');
            setActiveThreadId((prev) => prev || (unreadSupport || anyUnread).id);
          }
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token, loadInbox, loadThreads, tabFromUrl]);

  // Poll léger pour voir les nouveaux messages sans refresh manuel
  useEffect(() => {
    if (!token) return undefined;
    const id = setInterval(() => {
      loadInbox().catch(() => {});
      loadThreads().catch(() => {});
      if (tab === 'dm' && activeThreadId) {
        loadDmMessages(activeThreadId).catch(() => {});
      }
    }, 12000);
    return () => clearInterval(id);
  }, [token, tab, activeThreadId, loadInbox, loadThreads, loadDmMessages]);

  useEffect(() => {
    if (tab === 'dm' && activeThreadId) {
      loadDmMessages(activeThreadId).catch((e) => setError(e.message));
    }
  }, [tab, activeThreadId, loadDmMessages]);

  const unreadDm = useMemo(
    () => threads.reduce((n, t) => n + (Number(t.unread) || 0), 0),
    [threads]
  );

  const markInboxRead = async (ids) => {
    if (!token || !ids?.length) return;
    await fetch('/api/delivery/inbox', {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ messageIds: ids }),
    });
    await loadInbox();
  };

  const openInboxMessage = async (msg) => {
    const threadId = msg?.data?.threadId;
    if (threadId || msg?.event_type === 'admin_dm') {
      if (!msg.read) await markInboxRead([msg.id]);
      setTab('dm');
      setActiveThreadId(threadId || null);
      if (threadId) await loadDmMessages(threadId);
      return;
    }
    setSelectedInbox(msg);
    if (!msg.read) await markInboxRead([msg.id]);
  };

  const startDm = async (peerId) => {
    setSending(true);
    try {
      const res = await fetch('/api/delivery/dm/threads', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ peerId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Erreur');
      setActiveThreadId(json.thread.id);
      setTab('dm');
      await loadThreads();
      await loadDmMessages(json.thread.id);
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
        headers: authHeaders(),
        body: JSON.stringify({ body: dmBody.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Erreur envoi');
      setDmBody('');
      await loadDmMessages(activeThreadId);
      await loadThreads();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const activeThread = threads.find((t) => t.id === activeThreadId);
  const supportContacts = directory.filter((c) => c.kind === 'admin');
  const livreurContacts = directory.filter((c) => c.kind !== 'admin');

  return (
    <div className="min-h-screen bg-gray-50">
      <DeliveryNavbar />
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FaComments className="text-orange-500" />
              Messagerie
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Annonces admin + chat avec le support et les autres livreurs
            </p>
          </div>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            type="button"
            onClick={() => setTab('inbox')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
              tab === 'inbox' ? 'bg-orange-500 text-white' : 'bg-white text-gray-700 border'
            }`}
          >
            <FaInbox /> Annonces
            {unreadInbox > 0 && (
              <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{unreadInbox}</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab('dm')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
              tab === 'dm' ? 'bg-orange-500 text-white' : 'bg-white text-gray-700 border'
            }`}
          >
            <FaUsers /> Discussions
            {unreadDm > 0 && (
              <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{unreadDm}</span>
            )}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-16 text-orange-500">
            <FaSpinner className="animate-spin h-8 w-8" />
          </div>
        ) : tab === 'inbox' ? (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b font-medium text-gray-800">Messages reçus</div>
              <div className="max-h-[60vh] overflow-y-auto divide-y">
                {inbox.length === 0 && (
                  <p className="p-4 text-sm text-gray-500">
                    Aucune annonce. Les chats avec le support sont dans l&apos;onglet{' '}
                    <button type="button" className="text-orange-600 underline" onClick={() => setTab('dm')}>
                      Discussions
                    </button>
                    .
                  </p>
                )}
                {inbox.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => openInboxMessage(m)}
                    className={`w-full text-left px-4 py-3 hover:bg-orange-50 ${
                      selectedInbox?.id === m.id ? 'bg-orange-50' : ''
                    } ${!m.read ? 'font-semibold' : ''}`}
                  >
                    <div className="flex justify-between gap-2">
                      <span className="text-sm text-gray-900 truncate">{m.subject || '(sans sujet)'}</span>
                      {!m.read && <span className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 shrink-0" />}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {m.event_type === 'admin_dm'
                        ? 'Chat support'
                        : m.kind === 'system'
                          ? 'Système'
                          : 'Admin'}{' '}
                      · {new Date(m.created_at).toLocaleString('fr-FR')}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border shadow-sm p-5 min-h-[280px]">
              {selectedInbox ? (
                <>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h2 className="text-lg font-semibold text-gray-900">{selectedInbox.subject}</h2>
                    {selectedInbox.read && <FaCheckDouble className="text-green-500 mt-1" title="Lu" />}
                  </div>
                  <p className="text-xs text-gray-500 mb-4">
                    {new Date(selectedInbox.created_at).toLocaleString('fr-FR')}
                    {selectedInbox.event_type ? ` · ${selectedInbox.event_type}` : ''}
                  </p>
                  <div className="whitespace-pre-wrap text-gray-800 text-sm leading-relaxed">
                    {selectedInbox.body}
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">Sélectionne un message pour le lire.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden md:col-span-1">
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
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">{t.peer?.name}</span>
                      {t.unread > 0 && (
                        <span className="text-xs bg-orange-500 text-white px-1.5 rounded-full">{t.unread}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {t.last_message?.body || 'Aucun message'}
                    </p>
                  </button>
                ))}
                {threads.length === 0 && (
                  <p className="p-3 text-xs text-gray-500">Pas encore de conversation.</p>
                )}
              </div>
              <div className="border-t px-3 py-2 space-y-3">
                {supportContacts.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-2">Écrire au support</p>
                    <div className="max-h-28 overflow-y-auto space-y-1">
                      {supportContacts.map((l) => (
                        <button
                          key={l.id}
                          type="button"
                          disabled={sending}
                          onClick={() => startDm(l.id)}
                          className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-gray-100"
                        >
                          🛟 {l.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-2">Autres livreurs</p>
                  <div className="max-h-28 overflow-y-auto space-y-1">
                    {livreurContacts.map((l) => (
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
            </div>

            <div className="bg-white rounded-xl border shadow-sm md:col-span-2 flex flex-col min-h-[420px]">
              <div className="px-4 py-3 border-b font-medium">
                {activeThread ? activeThread.peer?.name : 'Choisis une conversation'}
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[50vh]">
                {!activeThreadId && (
                  <p className="text-sm text-gray-500">
                    Sélectionne le support ou un livreur pour discuter.
                  </p>
                )}
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
                    placeholder="Écrire un message…"
                    className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  <button
                    type="submit"
                    disabled={sending || !dmBody.trim()}
                    className="bg-orange-500 text-white px-4 py-2 rounded-lg disabled:opacity-50 flex items-center gap-2"
                  >
                    <FaPaperPlane />
                    Envoyer
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
