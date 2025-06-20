"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function ProfilRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/profile');
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded shadow text-center">
        <p className="text-gray-700">Redirection vers la page de profil...</p>
      </div>
    </div>
  );
}

export function Profil() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }
      setUser(session.user);
      // Récupérer le profil dans la table users
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
      if (error) setError(error.message);
      setProfile(data);
      setLoading(false);
    };
    getUser();
  }, [router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess('');
    setError('');
    setLoading(true);
    const { error } = await supabase
      .from('users')
      .update({
        nom: profile.nom,
        prenom: profile.prenom,
        telephone: profile.telephone,
        adresse: profile.adresse,
        code_postal: profile.code_postal,
        ville: profile.ville,
      })
      .eq('id', user.id);
    if (error) setError(error.message);
    else setSuccess('Profil mis à jour !');
    setLoading(false);
  };

  if (loading) return <div className="p-8 text-center">Chargement...</div>;
  if (!profile) return <div className="p-8 text-center text-red-600">Aucun profil trouvé.</div>;

  return (
    <div className="max-w-xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Mon profil</h1>
      {success && <div className="mb-4 p-2 bg-green-100 text-green-700 rounded">{success}</div>}
      {error && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Prénom</label>
            <input type="text" name="prenom" value={profile.prenom || ''} onChange={handleChange} className="input-primary" required />
          </div>
          <div>
            <label className="block text-sm font-medium">Nom</label>
            <input type="text" name="nom" value={profile.nom || ''} onChange={handleChange} className="input-primary" required />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input type="email" value={user.email} className="input-primary bg-gray-100" disabled />
        </div>
        <div>
          <label className="block text-sm font-medium">Téléphone</label>
          <input type="tel" name="telephone" value={profile.telephone || ''} onChange={handleChange} className="input-primary" required />
        </div>
        <div>
          <label className="block text-sm font-medium">Adresse</label>
          <input type="text" name="adresse" value={profile.adresse || ''} onChange={handleChange} className="input-primary" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Code postal</label>
            <input type="text" name="code_postal" value={profile.code_postal || ''} onChange={handleChange} className="input-primary" required />
          </div>
          <div>
            <label className="block text-sm font-medium">Ville</label>
            <input type="text" name="ville" value={profile.ville || ''} onChange={handleChange} className="input-primary" required />
          </div>
        </div>
        <button type="submit" disabled={loading} className="w-full bg-orange-500 text-white py-2 px-4 rounded-md hover:bg-orange-600">
          {loading ? 'Mise à jour...' : 'Enregistrer'}
        </button>
      </form>
    </div>
  );
} 