'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import { FaEdit, FaTrash, FaSpinner, FaLock } from 'react-icons/fa';
import { supabase } from '../../../lib/supabase';

export default function AdminUsers() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'user'
  });
  const [resettingPassword, setResettingPassword] = useState(null);
  const [resetPasswordResult, setResetPasswordResult] = useState(null);

  useEffect(() => {
    const checkUserAndFetchUsers = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      
      // Vérifier le rôle dans la table users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (userError || !userData || userData.role !== 'admin') {
        router.push('/');
        return;
      }
      
      fetchUsers();
    };
    checkUserAndFetchUsers();
  }, [router]);

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

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth('/api/admin/users');
      const data = await response.json();
      // Gérer le cas où l'API retourne un objet avec une propriété users
      setUsers(Array.isArray(data) ? data : (data.users || []));
    } catch (error) {
      setError('Erreur lors du chargement des utilisateurs');
      setUsers([]); // S'assurer que users est toujours un tableau
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingUser 
        ? `/api/admin/users/${editingUser.id}`
        : '/api/admin/users';
      
      const response = await fetchWithAuth(url, {
        method: editingUser ? 'PUT' : 'POST',
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Erreur lors de la sauvegarde de l\'utilisateur');
      setShowForm(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;

    try {
      const response = await fetchWithAuth(`/api/admin/users/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Erreur lors de la suppression de l\'utilisateur');
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role
    });
    setShowForm(true);
  };

  const handleResetPassword = async (email) => {
    if (!confirm(`Êtes-vous sûr de vouloir réinitialiser le mot de passe pour ${email} ?`)) return;

    setResettingPassword(email);
    setResetPasswordResult(null);
    setError(null);

    try {
      const response = await fetchWithAuth('/api/admin/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la réinitialisation du mot de passe');
      }

      setResetPasswordResult({
        success: true,
        email: data.email,
        nom: data.nom,
        newPassword: data.newPassword,
        message: data.message
      });
    } catch (err) {
      setError(err.message);
      setResetPasswordResult({
        success: false,
        message: err.message
      });
    } finally {
      setResettingPassword(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black dark:border-white"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestion des utilisateurs</h1>
            <button
              onClick={() => router.push('/admin')}
              className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Retour
            </button>
            <button
              onClick={() => {
                setEditingUser(null);
                setFormData({
                  name: '',
                  email: '',
                  phone: '',
                  role: 'user'
                });
                setShowForm(true);
              }}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
            >
              Ajouter un utilisateur
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
              {error}
            </div>
          )}

          {showForm && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
              <h2 className="text-xl font-bold mb-4">
                {editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nom
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Rôle
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      required
                    >
                      <option value="user">Utilisateur</option>
                      <option value="restaurant">Restaurant</option>
                      <option value="delivery">Livreur</option>
                      <option value="admin">Administrateur</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-black dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600"
                  >
                    {editingUser ? 'Mettre à jour' : 'Ajouter'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingUser(null);
                    }}
                    className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Nom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Téléphone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Rôle
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{user.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                          user.role === 'restaurant' ? 'bg-blue-100 text-blue-800' :
                          user.role === 'delivery' ? 'bg-orange-100 text-orange-800' :
                          'bg-green-100 text-green-800'}`}>
                        {user.role === 'admin' ? 'Administrateur' :
                         user.role === 'restaurant' ? 'Restaurant' :
                         user.role === 'delivery' ? 'Livreur' :
                         'Utilisateur'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(user)}
                        className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mr-4"
                        title="Modifier"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleResetPassword(user.email)}
                        disabled={resettingPassword === user.email}
                        className="text-blue-600 hover:text-blue-900 mr-4 disabled:opacity-50"
                        title="Réinitialiser le mot de passe"
                      >
                        {resettingPassword === user.email ? (
                          <FaSpinner className="animate-spin" />
                        ) : (
                          <FaLock />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Supprimer"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {users.length === 0 && !showForm && (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">Aucun utilisateur trouvé</p>
              </div>
            )}
          </div>

          {/* Modal pour afficher le nouveau mot de passe */}
          {resetPasswordResult && resetPasswordResult.success && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Mot de passe réinitialisé avec succès
                </h3>
                <div className="space-y-3 mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    <strong>Email:</strong> {resetPasswordResult.email}
                  </p>
                  {resetPasswordResult.nom && (
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      <strong>Nom:</strong> {resetPasswordResult.nom}
                    </p>
                  )}
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                      Nouveau mot de passe:
                    </p>
                    <div className="flex items-center justify-between bg-white dark:bg-gray-700 rounded px-3 py-2">
                      <code className="text-lg font-mono text-gray-900 dark:text-white">
                        {resetPasswordResult.newPassword}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(resetPasswordResult.newPassword);
                          alert('Mot de passe copié dans le presse-papiers');
                        }}
                        className="ml-2 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Copier
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    ⚠️ Conservez ce mot de passe en lieu sûr et communiquez-le au restaurant.
                  </p>
                </div>
                <button
                  onClick={() => setResetPasswordResult(null)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 