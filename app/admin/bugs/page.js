'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import { FaArrowLeft, FaBug, FaSpinner, FaCheckCircle, FaClock, FaTimesCircle } from 'react-icons/fa';

export default function AdminBugs() {
  const router = useRouter();
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('all');

  useEffect(() => {
    checkAuthAndFetch();
  }, [selectedStatus]);

  const checkAuthAndFetch = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (userError || !userData || userData.role !== 'admin') {
        router.push('/');
        return;
      }

      fetchBugs();
    } catch (err) {
      console.error('Erreur auth:', err);
      router.push('/login');
    }
  };

  const fetchWithAuth = async (url, options = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
  };

  const fetchBugs = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth('/api/admin/bugs');
      if (!response.ok) throw new Error('Erreur lors du chargement');
      const data = await response.json();
      setBugs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      setBugs([]);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (bugId, newStatus) => {
    try {
      const { error } = await supabase
        .from('bug_reports')
        .update({ status: newStatus })
        .eq('id', bugId);

      if (error) throw error;
      fetchBugs();
    } catch (err) {
      console.error('Erreur mise à jour statut:', err);
      alert('Erreur lors de la mise à jour du statut');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'resolved': return 'Résolu';
      case 'in_progress': return 'En cours';
      case 'pending': return 'En attente';
      case 'rejected': return 'Rejeté';
      default: return status;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'resolved': return <FaCheckCircle className="h-4 w-4" />;
      case 'in_progress': return <FaClock className="h-4 w-4" />;
      case 'rejected': return <FaTimesCircle className="h-4 w-4" />;
      default: return <FaClock className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Date inconnue';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (err) {
      return 'Date invalide';
    }
  };

  const filteredBugs = selectedStatus === 'all' 
    ? bugs 
    : bugs.filter(bug => bug.status === selectedStatus);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <FaSpinner className="animate-spin text-4xl text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin')}
                className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
              >
                <FaArrowLeft className="mr-2" />
                Retour au dashboard
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FaBug className="text-blue-600" />
                  Signalements de bugs
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                  Gérez les signalements de bugs des clients
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
              {error}
            </div>
          )}

          {/* Filtres */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedStatus('all')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedStatus === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Tous ({bugs.length})
              </button>
              <button
                onClick={() => setSelectedStatus('pending')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedStatus === 'pending'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                En attente ({bugs.filter(b => b.status === 'pending').length})
              </button>
              <button
                onClick={() => setSelectedStatus('in_progress')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedStatus === 'in_progress'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                En cours ({bugs.filter(b => b.status === 'in_progress').length})
              </button>
              <button
                onClick={() => setSelectedStatus('resolved')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedStatus === 'resolved'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Résolus ({bugs.filter(b => b.status === 'resolved').length})
              </button>
            </div>
          </div>

          {/* Liste des bugs */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
            {filteredBugs.length === 0 ? (
              <div className="text-center py-12">
                <FaBug className="text-6xl text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                  Aucun signalement de bug {selectedStatus !== 'all' ? `avec le statut "${getStatusText(selectedStatus)}"` : ''}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredBugs.map((bug) => (
                  <div key={bug.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {bug.title}
                          </h3>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(bug.status)}`}>
                            {getStatusIcon(bug.status)}
                            {getStatusText(bug.status)}
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-3">
                          {bug.description}
                        </p>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <span>URL: {bug.url || 'N/A'}</span>
                          <span>Navigateur: {bug.browser || 'N/A'}</span>
                          <span>Gravité: {bug.severity || 'medium'}</span>
                          <span>Date: {formatDate(bug.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {bug.status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateStatus(bug.id, 'in_progress')}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Marquer en cours
                          </button>
                          <button
                            onClick={() => updateStatus(bug.id, 'resolved')}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            Marquer résolu
                          </button>
                          <button
                            onClick={() => updateStatus(bug.id, 'rejected')}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                          >
                            Rejeter
                          </button>
                        </>
                      )}
                      {bug.status === 'in_progress' && (
                        <>
                          <button
                            onClick={() => updateStatus(bug.id, 'resolved')}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            Marquer résolu
                          </button>
                          <button
                            onClick={() => updateStatus(bug.id, 'pending')}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                          >
                            Remettre en attente
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

