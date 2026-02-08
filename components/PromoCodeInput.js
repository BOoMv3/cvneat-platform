'use client';

import { useState } from 'react';
import { FaTag, FaCheckCircle, FaTimesCircle, FaSpinner } from 'react-icons/fa';

async function readResponseBody(res) {
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  if (ct.includes('application/json')) {
    return await res.json().catch(() => ({}));
  }
  const text = await res.text().catch(() => '');
  return { _nonJson: true, text };
}

export default function PromoCodeInput({ 
  onCodeApplied, 
  appliedCode, 
  cartTotal, 
  restaurantId, 
  userId,
  isFirstOrder = false 
}) {
  const [code, setCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  const validatePromoCode = async () => {
    if (!code.trim()) {
      setValidationResult({ valid: false, message: 'Veuillez entrer un code promo' });
      return;
    }

    const orderAmount = Number(cartTotal);
    if (!Number.isFinite(orderAmount) || orderAmount <= 0) {
      setValidationResult({
        valid: false,
        message: 'Ajoutez des articles au panier avant d’appliquer un code promo.',
      });
      return;
    }

    setValidating(true);
    setValidationResult(null);

    const requestBody = {
      code: code.trim(),
      userId: userId,
      orderAmount: orderAmount,
      restaurantId: restaurantId,
      isFirstOrder: isFirstOrder,
    };

    const doValidate = async (url) => {
      const response = await fetch(url, {
        method: 'POST',
        // IMPORTANT:
        // Keep request "simple" (avoid CORS preflight) so it works even if the user is on cvneat.fr
        // and the request is redirected to www.cvneat.fr.
        // Sending JSON as plain text still works with request.json() server-side.
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(requestBody),
      });

      const data = await readResponseBody(response);

      if (!response.ok) {
        const hint =
          data?._nonJson && typeof data?.text === 'string' && data.text.toLowerCase().includes('redirecting')
            ? ' (redirection détectée — utilise https://www.cvneat.fr)'
            : '';
        throw new Error(
          (data?.error ||
            (data?._nonJson ? 'Erreur serveur (réponse non-JSON)' : null) ||
            `Erreur lors de la validation du code promo (HTTP ${response.status})`) + hint
        );
      }

      return data;
    };

    try {
      let data;
      try {
        data = await doValidate('/api/promo-codes/validate');
      } catch (e1) {
        // Fallback: certains navigateurs (ou un accès via cvneat.fr) peuvent échouer sur une redirection.
        try {
          data = await doValidate('https://www.cvneat.fr/api/promo-codes/validate');
        } catch {
          throw e1;
        }
      }

      if (data.valid) {
        setValidationResult({
          valid: true,
          message: data.message || 'Code promo valide !',
          discountAmount: data.discountAmount,
          discountType: data.discountType,
          description: data.description,
          promoCodeId: data.promoCodeId
        });
        
        // Appeler le callback avec les infos du code
        if (onCodeApplied) {
          onCodeApplied({
            code: code.trim().toUpperCase(),
            discountAmount: data.discountAmount,
            discountType: data.discountType,
            promoCodeId: data.promoCodeId,
            description: data.description
          });
        }
      } else {
        setValidationResult({
          valid: false,
          message: data?.message || 'Code promo invalide'
        });
      }
    } catch (error) {
      console.error('Erreur validation code promo:', error);
      setValidationResult({
        valid: false,
        message: error?.message || 'Erreur lors de la validation du code promo'
      });
    } finally {
      setValidating(false);
    }
  };

  const removePromoCode = () => {
    setCode('');
    setValidationResult(null);
    if (onCodeApplied) {
      onCodeApplied(null);
    }
  };

  return (
    <div className="space-y-2">
      {!appliedCode ? (
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <FaTag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && validatePromoCode()}
              placeholder="Code promo"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              disabled={validating}
            />
          </div>
          <button
            onClick={validatePromoCode}
            disabled={validating || !code.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {validating ? (
              <FaSpinner className="animate-spin h-4 w-4" />
            ) : (
              'Appliquer'
            )}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center gap-2">
            <FaCheckCircle className="text-green-600 dark:text-green-400 h-5 w-5" />
            <div>
              <p className="font-semibold text-green-800 dark:text-green-200">
                Code {appliedCode.code} appliqué !
              </p>
              {appliedCode.description && (
                <p className="text-xs text-green-600 dark:text-green-400">
                  {appliedCode.description}
                </p>
              )}
              <p className="text-sm font-bold text-green-700 dark:text-green-300">
                -{appliedCode.discountAmount.toFixed(2)}€
              </p>
            </div>
          </div>
          <button
            onClick={removePromoCode}
            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            title="Retirer le code promo"
          >
            <FaTimesCircle className="h-5 w-5" />
          </button>
        </div>
      )}

      {validationResult && !validationResult.valid && !appliedCode && (
        <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <FaTimesCircle className="text-red-600 dark:text-red-400 h-4 w-4 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{validationResult.message}</p>
        </div>
      )}
    </div>
  );
}

