'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { FaTag, FaSave, FaTimes } from 'react-icons/fa';
import Link from 'next/link';
import AuthGuard from '../../../components/AuthGuard';

export default function PartnerOffrePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restaurant, setRestaurant] = useState(null);
  const [offre_active, setOffreActive] = useState(false);
  const [offre_label, setOffreLabel] = useState('');
  const [offre_description, setOffreDescription] = useState('');

  useEffect(() => {
    fetchRestaurant();
  }, []);

  const fetchRestaurant = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: resto, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (error || !resto) {
        router.push('/partner');
        return;
      }
      setRestaurant(resto);
      setOffreActive(!!resto.offre_active);
      setOffreLabel(resto.offre_label || '');
      setOffreDescription(resto.offre_description || '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/partner/offre', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          offre_active,
          offre_label: offre_label.trim() || null,
          offre_description: offre_description.trim() || null
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur sauvegarde');
      }
      alert('Offre enregistrée ! Le badge apparaîtra sur la page d\'accueil.');
    } catch (err) {
      alert(err.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard requiredRole="partner">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-200 border-t-orange-600" />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRole="partner">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Link
            href="/partner"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
          >
            <FaTimes className="mr-2" /> Retour
          </Link>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Créer une offre / Promo
          </h1>
          <p className="text-gray-600 mb-8">
            Activez une offre pour afficher un badge sur votre fiche restaurant à l&apos;accueil (ex: &quot;Promo&quot;, &quot;1 acheté = 1 offert&quot;, &quot;Livraison offerte&quot;).
          </p>

          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
            <div>
              <label className="flex items-center gap-2 font-medium text-gray-900 mb-2">
                <input
                  type="checkbox"
                  checked={offre_active}
                  onChange={(e) => setOffreActive(e.target.checked)}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                Activer l&apos;offre (afficher le badge)
              </label>
              <p className="text-sm text-gray-500 ml-6">
                Quand activé, un badge sera visible sur votre restaurant à l&apos;accueil.
              </p>
            </div>

            <div>
              <label className="block font-medium text-gray-900 mb-2">
                Texte du badge
              </label>
              <input
                type="text"
                value={offre_label}
                onChange={(e) => setOffreLabel(e.target.value)}
                placeholder="Ex: Promo, 1 acheté = 1 offert, Livraison offerte"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                maxLength={50}
              />
              <p className="text-sm text-gray-500 mt-1">
                Court et percutant (50 caractères max). Si vide, &quot;Promo&quot; sera affiché.
              </p>
            </div>

            <div>
              <label className="block font-medium text-gray-900 mb-2">
                Description détaillée (optionnel)
              </label>
              <textarea
                value={offre_description}
                onChange={(e) => setOffreDescription(e.target.value)}
                placeholder="Ex: Offre valable sur toute la carte. Présentez ce message au livreur."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
              <p className="text-sm text-gray-500 mt-1">
                Visible sur la fiche restaurant ou dans les conditions de l&apos;offre.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-6 rounded-lg disabled:opacity-50"
              >
                <FaSave className="h-4 w-4" />
                {saving ? 'Enregistrement...' : 'Enregistrer l\'offre'}
              </button>
              <Link
                href="/partner"
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
              >
                Annuler
              </Link>
            </div>
          </form>
        </div>
      </div>
    </AuthGuard>
  );
}
