'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import {
  FaArrowLeft,
  FaSpinner,
  FaTruck,
  FaCheck,
  FaTimes,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
} from 'react-icons/fa';

const VEHICLE_LABELS = {
  bike: 'Vélo',
  scooter: 'Scooter',
  trotinette: 'Trotinette',
  car: 'Voiture',
  motorcycle: 'Moto',
};

const STATUS_LABELS = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Approuvée', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Refusée', color: 'bg-red-100 text-red-800' },
};

export default function DeliveryApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push('/login');
        return;
      }
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      if (userError || !userData || userData.role !== 'admin') {
        router.push('/login');
        return;
      }
      await fetchApplications();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/api/admin/delivery-applications', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error('Erreur lors du chargement');
      const data = await res.json();
      setApplications(data.applications || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`/api/admin/delivery-applications/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Erreur mise à jour');
      await fetchApplications();
    } catch (err) {
      alert(err.message || 'Erreur');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <FaSpinner className="animate-spin text-4xl text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => router.push('/admin')}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
        >
          <FaArrowLeft className="mr-2" />
          Retour au dashboard
        </button>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FaTruck />
          Candidatures livreurs
        </h1>
        <p className="text-gray-600 mt-1">
          Les demandes de devenir livreur sont stockées ici. Tu peux les approuver ou refuser.
        </p>

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
            {error}
            <button
              onClick={fetchApplications}
              className="ml-4 underline"
            >
              Réessayer
            </button>
          </div>
        )}

        <div className="mt-6 space-y-4">
          {applications.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              Aucune candidature pour le moment
            </div>
          ) : (
            applications.map((app) => {
              const st = STATUS_LABELS[app.status] || STATUS_LABELS.pending;
              return (
                <div
                  key={app.id}
                  className="bg-white rounded-lg shadow p-4 sm:p-6 border border-gray-200"
                >
                  <div className="flex flex-wrap justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {app.prenom} {app.nom}
                      </h2>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <FaEnvelope className="text-gray-400" />
                          {app.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <FaPhone className="text-gray-400" />
                          {app.phone}
                        </span>
                        <span className="flex items-center gap-1">
                          <FaMapMarkerAlt className="text-gray-400" />
                          {app.address}, {app.postal_code} {app.city}
                        </span>
                      </div>
                      <div className="mt-2 text-sm">
                        <span className="text-gray-500">Véhicule :</span>{' '}
                        {VEHICLE_LABELS[app.vehicle_type] || app.vehicle_type}
                        {app.has_license ? ' • Permis' : ' • Sans permis'}
                        {app.availability && (
                          <>
                            <span className="text-gray-500 ml-2">• Dispo :</span> {app.availability}
                          </>
                        )}
                        {app.experience && (
                          <>
                            <span className="text-gray-500 ml-2">• Expérience :</span> {app.experience}
                          </>
                        )}
                      </div>
                      <div className="mt-2 text-xs text-gray-400">
                        Candidature du {new Date(app.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${st.color}`}
                      >
                        {st.label}
                      </span>
                      {app.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateStatus(app.id, 'approved')}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                          >
                            <FaCheck /> Approuver
                          </button>
                          <button
                            onClick={() => updateStatus(app.id, 'rejected')}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                          >
                            <FaTimes /> Refuser
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
