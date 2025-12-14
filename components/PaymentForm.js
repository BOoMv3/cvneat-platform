'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

// Initialiser Stripe de manière sécurisée
let stripePromise = null;
const getStripePromise = () => {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      console.error('❌ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY non définie');
      return null;
    }
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
};

const CheckoutForm = ({ clientSecret, amount, paymentIntentId, onSuccess, onError, discount = 0, platformFee = 0 }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isElementReady, setIsElementReady] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (!stripe || !elements) {
      setError('Stripe n\'est pas initialisé');
      setLoading(false);
      return;
    }

    const paymentElement = elements.getElement(PaymentElement);
    if (!paymentElement) {
      setError('Le formulaire de paiement n’est pas encore prêt. Veuillez patienter quelques secondes.');
      setLoading(false);
      return;
    }

    if (!isElementReady) {
      setError('Le formulaire de paiement se charge. Merci de réessayer dans un instant.');
      setLoading(false);
      return;
    }

    try {
      // IMPORTANT: Appeler elements.submit() AVANT confirmPayment()
      // Cela valide le formulaire et prépare les données de paiement
      const { error: submitError } = await elements.submit();
      
      if (submitError) {
        // Erreur de validation du formulaire
        let errorMessage = submitError.message;
        if (submitError.type === 'validation_error') {
          errorMessage = 'Vérifiez que tous les champs sont correctement remplis.';
        }
        throw new Error(errorMessage);
      }

      // Maintenant que le formulaire est validé, confirmer le paiement
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required', // Ne pas rediriger si le paiement est immédiat
      });

      if (confirmError) {
        // Message d'erreur plus clair pour l'utilisateur
        let errorMessage = confirmError.message;
        if (confirmError.type === 'card_error') {
          errorMessage = 'Erreur de carte bancaire. Vérifiez vos informations ou essayez une autre carte.';
        } else if (confirmError.type === 'validation_error') {
          errorMessage = 'Vérifiez que tous les champs sont correctement remplis.';
        }
        throw new Error(errorMessage);
      }

      // Vérifier que le paiement a réussi
      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Confirmer côté serveur (optionnel mais recommandé)
        try {
          const confirmResponse = await fetch('/api/payment/confirm', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              paymentIntentId: paymentIntentId,
            }),
          });

          const confirmData = await confirmResponse.json();
          
          if (confirmData.error) {
            console.warn('⚠️ Erreur confirmation serveur (non bloquant):', confirmData.error);
            // Ne pas bloquer si la confirmation serveur échoue - le webhook Stripe gérera
          }
        } catch (serverError) {
          console.warn('⚠️ Erreur confirmation serveur (non bloquant):', serverError);
          // Ne pas bloquer - le paiement est déjà réussi côté Stripe
        }

        // Succès - appeler le callback
        onSuccess({ paymentIntentId, status: 'succeeded' });
      } else {
        throw new Error(`Paiement non complété. Statut: ${paymentIntent?.status || 'inconnu'}`);
      }
    } catch (err) {
      const errorMessage = err.message || 'Une erreur est survenue lors du paiement';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Récapitulatif rapide */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-700 text-xs sm:text-sm text-blue-900 dark:text-blue-100">
        <div className="flex justify-between"><span>Frais plateforme</span><span className="font-semibold">{Number(platformFee || 0).toFixed(2)}€</span></div>
        <div className="flex justify-between mt-1 pt-1 border-t border-blue-200 dark:border-blue-700"><span>Total à payer</span><span className="font-bold">{amount.toFixed(2)}€</span></div>
      </div>
      <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
          onReady={() => setIsElementReady(true)}
        />
      </div>
      
      {error && (
        <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">{error}</div>
      )}
      
      <button
        type="submit"
        disabled={!stripe || loading || !isElementReady}
        className="w-full bg-blue-600 dark:bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Traitement...
          </div>
        ) : (
          `Payer ${amount.toFixed(2)}€`
        )}
      </button>
    </form>
  );
};

const PaymentForm = ({ amount, paymentIntentId, clientSecret, onSuccess, onError, discount = 0, platformFee = 0 }) => {
  // Vérifier que les paramètres requis sont présents
  if (!clientSecret) {
    return (
      <div className="text-red-600 p-4 bg-red-50 rounded-lg">
        Erreur : Le formulaire de paiement n'est pas encore prêt. Veuillez patienter.
      </div>
    );
  }

  if (!amount || amount <= 0) {
    return (
      <div className="text-red-600 p-4 bg-red-50 rounded-lg">
        Erreur : Montant invalide. Veuillez réessayer.
      </div>
    );
  }

  const stripePromiseInstance = getStripePromise();
  if (!stripePromiseInstance) {
    return (
      <div className="text-red-600 p-4 bg-red-50 rounded-lg">
        Erreur : Configuration de paiement manquante. Veuillez contacter le support.
      </div>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe',
    },
  };

  return (
    <Elements stripe={stripePromiseInstance} options={options}>
      <CheckoutForm
        clientSecret={clientSecret}
        amount={amount}
        paymentIntentId={paymentIntentId}
        onSuccess={onSuccess}
        onError={onError}
        discount={discount}
        platformFee={platformFee}
      />
    </Elements>
  );
};

export default PaymentForm; 