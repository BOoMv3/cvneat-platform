'use client';

export default function SupportContactBlock({ className = '' }) {
  return (
    <div className={`mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-200 ${className}`}>
      <p className="font-medium mb-1">Un problème pour créer un compte, vous connecter ou payer ?</p>
      <p>
        Envoyez un SMS au{' '}
        <a href="tel:0786014171" className="font-semibold underline">
          07 86 01 41 71
        </a>
        {' '}avec : votre email, nom, prénom et le problème rencontré. Nous vous répondrons rapidement.
      </p>
    </div>
  );
}
