'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FaEnvelope, FaSpinner, FaCheck, FaTimes, FaUsers, FaDownload } from 'react-icons/fa';

export default function NewsletterPage() {
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [textContent, setTextContent] = useState('');
  const [sending, setSending] = useState(false);
  const [exportingSms, setExportingSms] = useState(false);
  const [exportingEmails, setExportingEmails] = useState(false);
  const [progress, setProgress] = useState({ sent: 0, total: 0, errors: [] });
  const [preview, setPreview] = useState({ count: 0, emails: [] });

  const submitDownloadForm = (endpoint, token) => {
    const iframeName = 'cvneat_download_frame';
    let iframe = document.querySelector(`iframe[name="${iframeName}"]`);
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.name = iframeName;
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
    }

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = endpoint;
    form.target = iframeName;
    form.style.display = 'none';

    const tokenInput = document.createElement('input');
    tokenInput.type = 'hidden';
    tokenInput.name = 'access_token';
    tokenInput.value = token;
    form.appendChild(tokenInput);

    document.body.appendChild(form);
    form.submit();
    form.remove();
  };

  // Récupérer le nombre d'utilisateurs et un aperçu des emails
  const fetchUsersPreview = async () => {
    try {
      // Récupérer depuis la table users
      const { data: users, error } = await supabase
        .from('users')
        .select('email, nom, prenom, role')
        .not('email', 'is', null)
        .limit(10);

      if (error) {
        console.warn('Erreur récupération table users:', error);
      }

      // Compter tous les utilisateurs depuis la table users
      const { count: totalCount, error: countError } = await supabase
        .from('users')
        .select('email', { count: 'exact', head: true })
        .not('email', 'is', null);

      if (countError) {
        console.warn('Erreur comptage utilisateurs:', countError);
      }

      const finalCount = totalCount || users?.length || 0;
      const previewEmails = users?.slice(0, 5).map(u => u.email).filter(Boolean) || [];

      setPreview({
        count: finalCount,
        emails: previewEmails
      });

      // Afficher un avertissement si aucun utilisateur trouvé
      if (finalCount === 0) {
        console.warn('⚠️ Aucun utilisateur trouvé dans la table users');
      }
    } catch (error) {
      console.error('Erreur récupération utilisateurs:', error);
      alert('Erreur lors de la récupération des utilisateurs: ' + error.message);
    }
  };

  // Envoyer l'email en masse
  const sendNewsletter = async () => {
    if (!subject.trim() || !htmlContent.trim()) {
      alert('Veuillez remplir le sujet et le contenu HTML');
      return;
    }

    if (!confirm(`Êtes-vous sûr de vouloir envoyer cet email à ${preview.count} utilisateurs ?`)) {
      return;
    }

    setSending(true);
    setProgress({ sent: 0, total: 0, errors: [] });

    try {
      // Récupérer le token d'authentification
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        alert('Vous devez être connecté pour envoyer des emails');
        setSending(false);
        return;
      }

      const response = await fetch('/api/admin/newsletter/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subject: subject.trim(),
          html: htmlContent.trim(),
          text: textContent.trim() || htmlContent.replace(/<[^>]*>/g, '').trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'envoi');
      }

      // Suivre la progression si l'API retourne un stream
      if (data.progress) {
        setProgress(data.progress);
      } else {
        setProgress({
          sent: data.sent || 0,
          total: data.total || 0,
          errors: data.errors || []
        });
      }

      if (data.success) {
        alert(`✅ Email envoyé avec succès à ${data.sent || 0} utilisateurs !`);
        setSubject('');
        setHtmlContent('');
        setTextContent('');
      }
    } catch (error) {
      console.error('Erreur envoi newsletter:', error);
      alert(`❌ Erreur: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  const exportSmsContacts = async () => {
    setExportingSms(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        alert('Vous devez être connecté pour exporter les contacts SMS.');
        return;
      }

      submitDownloadForm('/api/admin/newsletter/export-sms', token);
    } catch (error) {
      console.error('Erreur export SMS:', error);
      alert(`❌ Erreur export SMS: ${error.message}`);
    } finally {
      setExportingSms(false);
    }
  };

  const exportEmailContacts = async () => {
    setExportingEmails(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        alert('Vous devez être connecté pour exporter les emails.');
        return;
      }

      submitDownloadForm('/api/admin/newsletter/export-emails', token);
    } catch (error) {
      console.error('Erreur export emails:', error);
      alert(`❌ Erreur export emails: ${error.message}`);
    } finally {
      setExportingEmails(false);
    }
  };

  // Charger l'aperçu au montage
  useEffect(() => {
    fetchUsersPreview();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
                  <FaEnvelope className="h-6 w-6 sm:h-8 sm:w-8 mr-3 text-blue-600" />
                  Newsletter - Email en masse
                </h1>
                <p className="text-gray-600 mt-2">Envoyer un email à tous les membres du site</p>
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-800">
                    📧 <strong>Configuration Brevo :</strong> Les emails seront envoyés depuis <code className="bg-blue-100 px-1 rounded">contact@cvneat.fr</code> via Brevo.
                    <br />
                    ⚙️ Assurez-vous d'avoir configuré les variables d'environnement dans Vercel (EMAIL_HOST, EMAIL_USER, EMAIL_PASS).
                    <br />
                    📖 Guide complet : <code className="bg-blue-100 px-1 rounded">GUIDE_CONFIGURATION_BREVO.md</code>
                  </p>
                </div>
              </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportEmailContacts}
                disabled={exportingEmails}
                className="px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {exportingEmails ? (
                  <FaSpinner className="inline mr-2 animate-spin" />
                ) : (
                  <FaDownload className="inline mr-2" />
                )}
                Export Emails (CSV Brevo)
              </button>
              <button
                onClick={exportSmsContacts}
                disabled={exportingSms}
                className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-800 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {exportingSms ? (
                  <FaSpinner className="inline mr-2 animate-spin" />
                ) : (
                  <FaDownload className="inline mr-2" />
                )}
                Export SMS (CSV Brevo)
              </button>
              <button
                onClick={fetchUsersPreview}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
              >
                <FaUsers className="inline mr-2" />
                Actualiser
              </button>
            </div>
          </div>

          {/* Aperçu du nombre d'utilisateurs */}
          {preview.count > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    📧 {preview.count} utilisateur{preview.count > 1 ? 's' : ''} recevra{preview.count > 1 ? 'ont' : ''} cet email
                  </p>
                  {preview.emails.length > 0 && (
                    <p className="text-xs text-blue-700 mt-1">
                      Aperçu: {preview.emails.join(', ')}...
                    </p>
                  )}
                  <p className="text-xs text-blue-600 mt-2 font-medium">
                    📮 Email envoyé depuis: <span className="font-semibold">contact@cvneat.fr</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Formulaire */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sujet de l'email *
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex: Nouvelle promotion, Nouveautés, etc."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={sending}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contenu HTML *
              </label>
              <textarea
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                placeholder="<h1>Bonjour !</h1><p>Votre contenu HTML ici...</p>"
                rows={12}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                disabled={sending}
              />
              <p className="text-xs text-gray-500 mt-1">
                Vous pouvez utiliser du HTML pour formater votre email
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contenu texte (optionnel - pour les clients qui ne supportent pas HTML)
              </label>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Version texte de votre email..."
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={sending}
              />
            </div>

            {/* Progression */}
            {sending && progress.total > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Envoi en cours...
                  </span>
                  <span className="text-sm text-gray-600">
                    {progress.sent} / {progress.total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.sent / progress.total) * 100}%` }}
                  />
                </div>
                {progress.errors.length > 0 && (
                  <div className="mt-2 text-xs text-red-600">
                    {progress.errors.length} erreur(s) - Voir la console pour les détails
                  </div>
                )}
              </div>
            )}

            {/* Bouton d'envoi */}
            <div className="flex items-center justify-end space-x-4">
              <button
                onClick={sendNewsletter}
                disabled={sending || !subject.trim() || !htmlContent.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center"
              >
                {sending ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <FaEnvelope className="mr-2" />
                    Envoyer à tous les membres
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

