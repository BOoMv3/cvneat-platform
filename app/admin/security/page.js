'use client';
import { useState, useEffect } from 'react';
import { FaShieldAlt, FaExclamationTriangle, FaCheckCircle, FaTimesCircle, FaEye, FaLock } from 'react-icons/fa';

export default function SecurityDashboard() {
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    try {
      // Simuler des données de sécurité (à remplacer par un appel API réel)
      const mockStats = {
        totalEvents: 1247,
        eventsLast24h: 23,
        suspiciousIPs: 3,
        failedAttempts: [
          ['192.168.1.100', 7],
          ['10.0.0.50', 5],
          ['203.0.113.42', 12]
        ],
        eventsByType: {
          'LOGIN_ATTEMPT': 45,
          'LOGIN_SUCCESS': 38,
          'LOGIN_FAILED': 7,
          'RATE_LIMIT_EXCEEDED': 2,
          'SUSPICIOUS_ACTIVITY': 1
        },
        eventsByRiskLevel: {
          'LOW': 40,
          'MEDIUM': 3,
          'HIGH': 1,
          'CRITICAL': 0
        }
      };

      const mockEvents = [
        {
          id: 'evt_1',
          type: 'LOGIN_FAILED',
          details: { email: 'user@example.com', reason: 'Invalid password' },
          riskLevel: 'MEDIUM',
          ip: '192.168.1.100',
          timestamp: '2024-01-15T10:30:00Z',
          userAgent: 'Mozilla/5.0...'
        },
        {
          id: 'evt_2',
          type: 'RATE_LIMIT_EXCEEDED',
          details: { endpoint: '/api/orders', limit: 50 },
          riskLevel: 'MEDIUM',
          ip: '10.0.0.50',
          timestamp: '2024-01-15T09:15:00Z',
          userAgent: 'Mozilla/5.0...'
        },
        {
          id: 'evt_3',
          type: 'SUSPICIOUS_ACTIVITY',
          details: { reason: 'Multiple failed login attempts' },
          riskLevel: 'HIGH',
          ip: '203.0.113.42',
          timestamp: '2024-01-15T08:45:00Z',
          userAgent: 'Mozilla/5.0...'
        }
      ];

      setStats(mockStats);
      setEvents(mockEvents);
    } catch (error) {
      console.error('Erreur lors du chargement des données de sécurité:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'LOW': return 'text-green-600 bg-green-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'HIGH': return 'text-orange-600 bg-orange-100';
      case 'CRITICAL': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'LOGIN_SUCCESS': return <FaCheckCircle className="text-green-500" />;
      case 'LOGIN_FAILED': return <FaTimesCircle className="text-red-500" />;
      case 'RATE_LIMIT_EXCEEDED': return <FaExclamationTriangle className="text-yellow-500" />;
      case 'SUSPICIOUS_ACTIVITY': return <FaShieldAlt className="text-orange-500" />;
      default: return <FaEye className="text-blue-500" />;
    }
  };

  const filteredEvents = filter === 'all' 
    ? events 
    : events.filter(event => event.riskLevel === filter.toUpperCase());

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des données de sécurité...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <FaLock className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Dashboard de Sécurité
            </h1>
          </div>
          <p className="text-gray-600">
            Surveillance en temps réel de la sécurité de l'application
          </p>
        </div>

        {/* Statistiques principales */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FaShieldAlt className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Événements Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalEvents || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <FaCheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Dernières 24h</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.eventsLast24h || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <FaExclamationTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">IPs Suspectes</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.suspiciousIPs || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <FaTimesCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tentatives Échouées</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.failedAttempts?.reduce((sum, [, count]) => sum + count, 0) || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtres et événements */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-0">
                Événements de Sécurité
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    filter === 'all'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Tous
                </button>
                <button
                  onClick={() => setFilter('high')}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    filter === 'high'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Élevé
                </button>
                <button
                  onClick={() => setFilter('critical')}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    filter === 'critical'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Critique
                </button>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {filteredEvents.map((event) => (
              <div key={event.id} className="p-4 sm:p-6 hover:bg-gray-50">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    {getEventIcon(event.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {event.type.replace(/_/g, ' ')}
                      </p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskColor(event.riskLevel)}`}>
                        {event.riskLevel}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      {event.details?.reason || event.details?.email || 'Détails non disponibles'}
                    </p>
                    <div className="mt-2 flex items-center text-xs text-gray-500 space-x-4">
                      <span>IP: {event.ip}</span>
                      <span>{new Date(event.timestamp).toLocaleString('fr-FR')}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredEvents.length === 0 && (
            <div className="p-8 text-center">
              <FaShieldAlt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Aucun événement trouvé pour ce filtre</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
