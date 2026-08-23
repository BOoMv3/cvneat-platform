'use client';

import { Component } from 'react';
import { hardNavigate } from '@/lib/compat';

/**
 * Évite qu'une erreur React fasse planter toute la page partenaire (Sunmi WebView).
 */
export default class PartnerErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || 'Erreur inattendue',
    };
  }

  componentDidCatch(error, info) {
    console.error('[PartnerErrorBoundary]', error?.message || error, info?.componentStack);
  }

  handleReload = () => {
    try {
      hardNavigate('/partner');
    } catch (_) {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 text-center">
            <p className="text-lg font-semibold text-gray-900 mb-2">Page partenaire interrompue</p>
            <p className="text-sm text-gray-600 mb-4">
              Un problème d&apos;affichage est survenu. Recharge la page pour continuer à gérer les commandes.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium"
            >
              Recharger le dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
