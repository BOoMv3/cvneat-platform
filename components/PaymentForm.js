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

  // Gérer le retour après une authentification 3DS / redirection Stripe (return_url)
  // Sans ça, le client peut voir "ça charge puis rien" alors que Stripe a bien débité.
  useEffect(() => {
    if (!stripe) return;
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const returnedClientSecret = params.get('payment_intent_client_secret');
    const redirectStatus = params.get('redirect_status');
    const returnedPaymentIntentId = params.get('payment_intent');

    // Ne traiter que si on revient bien d'un redirect Stripe
    if (!returnedClientSecret && !returnedPaymentIntentId) return;

    const run = async () => {
      try {
        const secretToUse = returnedClientSecret || clientSecret;
        if (!secretToUse) return;

        const { paymentIntent } = await stripe.retrievePaymentIntent(secretToUse);
        if (!paymentIntent) return;

        console.log('🔄 Retour Stripe détecté:', {
          redirectStatus,
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
        });

        if (paymentIntent.status === 'succeeded') {
          // Confirmer côté serveur (non bloquant)
          try {
            await fetch('/api/payment/confirm', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
            });
          } catch {
            // ignore
          }

          // Nettoyer l'URL pour éviter de re-déclencher au refresh
          try {
            const cleanUrl = window.location.pathname + window.location.hash;
            window.history.replaceState({}, '', cleanUrl);
          } catch {
            // ignore
          }

          onSuccess({ paymentIntentId: paymentIntent.id, status: 'succeeded' });
          return;
        }

        if (paymentIntent.status === 'processing') {
          // Paiement en cours (certains moyens de paiement / banques)
          setError(null);
          return;
        }

        if (paymentIntent.status === 'requires_payment_method') {
          const msg = 'Paiement non validé. Veuillez essayer une autre carte/méthode de paiement.';
          setError(msg);
          onError(msg);
          return;
        }
      } catch (e) {
        console.warn('⚠️ Erreur récupération PaymentIntent après redirect:', e?.message || e);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stripe]);

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
        // Logger l'erreur complète pour déboguer
        console.error('❌ Erreur Stripe confirmPayment:', {
          type: confirmError.type,
          code: confirmError.code,
          message: confirmError.message,
          decline_code: confirmError.decline_code,
          payment_intent: confirmError.payment_intent,
          fullError: confirmError
        });

        // Message d'erreur plus clair et spécifique selon le code d'erreur Stripe
        let errorMessage = confirmError.message || 'Une erreur est survenue lors du paiement.';
        
        if (confirmError.type === 'card_error') {
          // Codes d'erreur Stripe spécifiques pour les cartes
          switch (confirmError.code) {
            case 'card_declined':
              // Raison spécifique du refus
              switch (confirmError.decline_code) {
                case 'insufficient_funds':
                  errorMessage = 'Fonds insuffisants. Vérifiez le solde de votre carte ou essayez une autre carte.';
                  break;
                case 'lost_card':
                  errorMessage = 'Cette carte a été signalée comme perdue. Veuillez utiliser une autre carte.';
                  break;
                case 'stolen_card':
                  errorMessage = 'Cette carte a été signalée comme volée. Veuillez utiliser une autre carte.';
                  break;
                case 'expired_card':
                  errorMessage = 'Votre carte a expiré. Veuillez utiliser une autre carte.';
                  break;
                case 'incorrect_cvc':
                  errorMessage = 'Le code de sécurité (CVC) est incorrect. Vérifiez et réessayez.';
                  break;
                case 'incorrect_number':
                  errorMessage = 'Le numéro de carte est incorrect. Vérifiez et réessayez.';
                  break;
                case 'generic_decline':
                  errorMessage = 'Votre carte a été refusée. Contactez votre banque ou essayez une autre carte.';
                  break;
                default:
                  errorMessage = `Votre carte a été refusée${confirmError.decline_code ? ` (${confirmError.decline_code})` : ''}. Contactez votre banque ou essayez une autre carte.`;
              }
              break;
            case 'expired_card':
              errorMessage = 'Votre carte a expiré. Veuillez utiliser une autre carte.';
              break;
            case 'incorrect_cvc':
              errorMessage = 'Le code de sécurité (CVC) est incorrect. Vérifiez et réessayez.';
              break;
            case 'incorrect_number':
              errorMessage = 'Le numéro de carte est incorrect. Vérifiez et réessayez.';
              break;
            case 'insufficient_funds':
              errorMessage = 'Fonds insuffisants. Vérifiez le solde de votre carte ou essayez une autre carte.';
              break;
            case 'invalid_cvc':
              errorMessage = 'Le code de sécurité (CVC) est invalide. Vérifiez et réessayez.';
              break;
            case 'invalid_expiry_month':
            case 'invalid_expiry_year':
              errorMessage = 'La date d\'expiration est invalide. Vérifiez et réessayez.';
              break;
            case 'invalid_number':
              errorMessage = 'Le numéro de carte est invalide. Vérifiez et réessayez.';
              break;
            default:
              // Message par défaut avec le code d'erreur pour déboguer
              errorMessage = confirmError.message || 'Erreur de carte bancaire. Vérifiez vos informations ou essayez une autre carte.';
          }
        } else if (confirmError.type === 'validation_error') {
          errorMessage = 'Vérifiez que tous les champs sont correctement remplis.';
        } else if (confirmError.type === 'rate_limit_error') {
          errorMessage = 'Trop de tentatives. Veuillez patienter quelques instants avant de réessayer.';
        } else if (confirmError.type === 'api_connection_error') {
          errorMessage = 'Erreur de connexion. Vérifiez votre connexion internet et réessayez.';
        } else if (confirmError.type === 'api_error') {
          errorMessage = 'Erreur technique. Veuillez réessayer dans quelques instants.';
        }
        
        throw new Error(errorMessage);
      }

      // Vérifier que le paiement a réussi - IMPORTANT: onSuccess est appelé UNIQUEMENT si status === 'succeeded'
      if (paymentIntent && paymentIntent.status === 'succeeded') {
        console.log('✅ Paiement réussi, statut:', paymentIntent.status);
        
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

        // Succès - appeler le callback UNIQUEMENT si le statut est succeeded
        onSuccess({ paymentIntentId, status: 'succeeded' });
      } else if (paymentIntent && paymentIntent.status === 'processing') {
        // Ne pas traiter comme une erreur (sinon le client voit "ça charge puis stop")
        console.warn('⏳ Paiement en cours de traitement:', paymentIntent.status);
        setError(null);
        // Laisser le retour Stripe / webhook gérer la finalisation
        // Option UX: on peut afficher un message ici
      } else if (paymentIntent && paymentIntent.status === 'requires_payment_method') {
        // Le paiement nécessite une nouvelle méthode de paiement (carte refusée)
        console.error('❌ Carte refusée, statut:', paymentIntent.status);
        throw new Error('Votre carte a été refusée. Veuillez essayer avec une autre carte ou vérifier vos informations de paiement.');
      } else if (paymentIntent && paymentIntent.status === 'canceled') {
        // Le paiement a été annulé
        console.error('❌ Paiement annulé, statut:', paymentIntent.status);
        throw new Error('Le paiement a été annulé. Veuillez réessayer.');
      } else {
        // Autre statut (processing, requires_action, requires_capture, etc.) = ÉCHEC
        const statusMessage = paymentIntent?.status || 'inconnu';
        console.error('❌ Statut de paiement non réussi:', statusMessage);
        // Ne PAS appeler onSuccess pour ces statuts
        throw new Error(`Le paiement n'a pas pu être complété (statut: ${statusMessage}). Veuillez réessayer avec une autre méthode de paiement.`);
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
        <div className="flex justify-between mt-1 pt-1 border-t border-blue-200 dark:border-blue-700"><span>Total à payer</span><span className="font-bold">{Number(amount || 0).toFixed(2)}€</span></div>
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
          `Payer ${Number(amount || 0).toFixed(2)}€`
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
        Erreur : Configuration de paiement manquante. Veuillez contacter contact@cvneat.fr
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