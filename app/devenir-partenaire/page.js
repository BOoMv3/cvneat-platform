'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  FaArrowRight,
  FaCheck,
  FaMotorcycle,
  FaStore,
  FaUtensils,
  FaChevronDown,
} from 'react-icons/fa';

const CvneatLogo = dynamic(() => import('@/components/CvneatLogo'), { ssr: false });

const FAQ = [
  {
    q: 'Combien coûte CVN’EAT ?',
    a: 'Rien à payer de votre côté pour démarrer : pas d’abonnement mensuel, pas de frais d’entrée. CVN’EAT applique uniquement une commission de 20 % sur les commandes réalisées via la plateforme.',
  },
  {
    q: 'Suis-je engagé avec CVN’EAT ?',
    a: 'Non. CVN’EAT est sans engagement et sans exclusivité. Vous pouvez essayer le service tout en conservant vos autres canaux de vente.',
  },
  {
    q: 'Dois-je travailler exclusivement avec CVN’EAT ?',
    a: 'Non. Aucune exclusivité. Vous pouvez continuer à utiliser vos autres plateformes et canaux de vente.',
  },
  {
    q: 'Puis-je rejoindre si je suis déjà sur une autre plateforme ?',
    a: 'Oui. CVN’EAT devient simplement un canal de commandes supplémentaire pour votre établissement.',
  },
  {
    q: 'Qui s’occupe de la livraison ?',
    a: 'CVN’EAT organise la livraison via son réseau de livreurs locaux. Vous préparez, on s’occupe du reste.',
  },
  {
    q: 'Comment mon établissement est-il mis en ligne ?',
    a: 'Notre équipe vous accompagne pour intégrer votre carte, vos horaires et configurer votre espace partenaire.',
  },
  {
    q: 'Comment vais-je recevoir les commandes ?',
    a: 'Les commandes arrivent dans votre interface partenaire CVN’EAT, avec alertes et suivi. Impression ticket compatible.',
  },
];

function scrollTo(id) {
  if (typeof document === 'undefined') return;
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function DevenirPartenairePage() {
  const [openFaq, setOpenFaq] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    website: '',
    nom: '',
    ville: '',
    contact_name: '',
    telephone: '',
    email: '',
  });

  const offerLine = useMemo(() => '20 % · 0 € pour démarrer · Sans engagement', []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/restaurant-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Échec de l’envoi');
      setSuccess(true);
      setForm({
        website: '',
        nom: '',
        ville: '',
        contact_name: '',
        telephone: '',
        email: '',
      });
    } catch (err) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="sticky top-0 z-40 border-b border-orange-100/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <CvneatLogo size="sm" href={null} />
            <span className="truncate text-lg font-black tracking-tight text-gray-900">
              CVN&apos;EAT
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-gray-600 md:flex">
            <button type="button" onClick={() => scrollTo('comment')} className="hover:text-orange-600">
              Comment ça marche
            </button>
            <button type="button" onClick={() => scrollTo('offre')} className="hover:text-orange-600">
              L&apos;offre
            </button>
            <button type="button" onClick={() => scrollTo('faq')} className="hover:text-orange-600">
              FAQ
            </button>
          </nav>
          <button
            type="button"
            onClick={() => scrollTo('rejoindre')}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-3.5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-orange-600"
          >
            Rejoindre CVN&apos;EAT
            <FaArrowRight className="h-3 w-3" />
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-orange-100 bg-gradient-to-b from-orange-50/80 via-white to-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-20">
          <div>
            <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.18em] text-orange-600">
              CVN&apos;EAT pour les restaurants
            </p>
            <h1 className="text-4xl font-black leading-[1.08] tracking-tight text-gray-900 sm:text-5xl lg:text-[3.25rem]">
              Une nouvelle source{' '}
              <span className="text-orange-600">de commandes.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-gray-600 sm:text-lg">
              Développez votre activité avec CVN&apos;EAT, sans coût fixe et sans engagement.
            </p>
            <p className="mt-4 text-base font-bold text-gray-900 sm:text-lg">{offerLine}</p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => scrollTo('rejoindre')}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3.5 text-base font-bold text-white shadow-md shadow-orange-500/25 hover:bg-orange-600"
              >
                Rejoindre CVN&apos;EAT
                <FaArrowRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => scrollTo('comment')}
                className="text-sm font-semibold text-gray-600 underline-offset-4 hover:text-orange-600 hover:underline"
              >
                Découvrir comment ça marche
              </button>
            </div>
            <p className="mt-5 text-sm text-gray-500">
              Déjà sur d&apos;autres plateformes ? Vous pouvez les garder.
            </p>
          </div>

          {/* Mock UI */}
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -left-2 top-6 z-10 rounded-xl border border-orange-100 bg-white px-3 py-2 text-xs font-semibold text-gray-800 shadow-md sm:-left-6">
              Nouvelle commande <span className="text-orange-600">+42,50 €</span>
            </div>
            <div className="absolute -right-1 top-24 z-10 rounded-xl border border-orange-100 bg-white px-3 py-2 text-xs font-semibold text-gray-800 shadow-md sm:-right-4">
              Livreur trouvé <FaCheck className="ml-1 inline text-green-500" />
            </div>
            <div className="absolute bottom-16 left-0 z-10 rounded-xl border border-orange-100 bg-white px-3 py-2 text-xs font-semibold text-gray-800 shadow-md sm:-left-4">
              Commande prête <FaCheck className="ml-1 inline text-green-500" />
            </div>

            <div className="relative rotate-1 rounded-3xl bg-gray-900 p-5 text-white shadow-2xl shadow-orange-500/20 sm:rotate-2 sm:p-6">
              <div className="mb-4 flex items-center justify-between text-sm text-gray-300">
                <span>Nouvelle commande</span>
                <span className="font-mono text-xs">#1842</span>
              </div>
              <p className="text-4xl font-black tracking-tight">42,50 €</p>
              <div className="mt-5 flex items-center gap-2 text-sm">
                <span className="text-gray-400">Prête dans</span>
                <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-white">
                  10 min
                </span>
              </div>
              <div className="mt-4 grid gap-2">
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                  Commande acceptée
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                  Préparation en cours
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Offre */}
      <section id="offre" className="scroll-mt-24 border-b border-orange-100 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.18em] text-orange-600">
            Une offre simple
          </p>
          <h2 className="max-w-3xl text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
            Rien à payer par vous !{' '}
            <span className="text-orange-600">Sans engagement.</span>
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { k: '20 %', v: 'Commission' },
              { k: '0 €', v: 'À payer pour démarrer' },
              { k: 'Libre', v: 'Sans engagement' },
            ].map((item) => (
              <div
                key={item.k}
                className="rounded-2xl border border-orange-100 bg-orange-50/50 px-6 py-8 text-center"
              >
                <p className="text-4xl font-black text-orange-600 sm:text-5xl">{item.k}</p>
                <p className="mt-2 text-sm font-semibold text-gray-600">{item.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Multi plateforme */}
      <section className="border-b border-orange-100 bg-gradient-to-b from-orange-50/40 to-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="max-w-3xl text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
            Déjà sur d&apos;autres plateformes ?{' '}
            <span className="text-orange-600">Gardez-les.</span>
          </h2>
          <p className="mt-4 max-w-2xl text-gray-600">
            CVN&apos;EAT s&apos;ajoute simplement à vos sources de commandes existantes.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3 text-sm font-semibold">
            <span className="rounded-full border border-gray-200 bg-white px-4 py-2 text-gray-700">
              Vos canaux actuels
            </span>
            <span className="text-orange-500">+</span>
            <span className="rounded-full bg-orange-500 px-4 py-2 text-white">CVN&apos;EAT</span>
            <span className="text-gray-400">→</span>
            <span className="rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-orange-700">
              Une source de commandes supplémentaire
            </span>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section id="comment" className="scroll-mt-24 border-b border-orange-100 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.18em] text-orange-600">
            Comment ça marche
          </p>
          <h2 className="max-w-3xl text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
            De votre inscription à votre première commande.
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                n: '01',
                title: 'Rejoignez CVN’EAT',
                text: 'Vous nous transmettez les informations de votre établissement.',
                icon: FaStore,
              },
              {
                n: '02',
                title: 'On s’occupe de votre mise en ligne',
                text: 'Notre équipe intègre votre carte et configure votre commerce.',
                icon: FaUtensils,
              },
              {
                n: '03',
                title: 'Recevez vos commandes',
                text: 'Vous préparez. CVN’EAT organise la livraison.',
                icon: FaMotorcycle,
              },
            ].map((step) => (
              <div key={step.n} className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-black text-orange-500">{step.n}</span>
                  <step.icon className="h-5 w-5 text-orange-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">{step.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* App accept */}
      <section className="border-b border-orange-100 bg-gradient-to-b from-white to-orange-50/50 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
              Une commande arrive.{' '}
              <span className="text-orange-600">Vous savez quoi faire.</span>
            </h2>
            <p className="mt-3 text-gray-600">Alertes · temps de préparation · suivi des commandes</p>
          </div>
          <div className="mx-auto mt-10 max-w-md rounded-3xl border border-orange-100 bg-white p-6 shadow-lg shadow-orange-500/10">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-500">Nouvelle commande</p>
                <p className="font-mono text-xs text-gray-400">#1842</p>
              </div>
              <p className="text-2xl font-black text-gray-900">42,50 €</p>
            </div>
            <p className="mt-6 text-sm font-semibold text-gray-600">Préparation</p>
            <div className="mt-2 flex gap-2">
              {['10 min', '15 min', '20 min'].map((t, i) => (
                <span
                  key={t}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                    i === 0
                      ? 'bg-orange-500 text-white'
                      : 'border border-orange-200 bg-orange-50 text-orange-700'
                  }`}
                >
                  {t}
                </span>
              ))}
            </div>
            <button
              type="button"
              className="mt-6 w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white"
            >
              Accepter
            </button>
          </div>
        </div>
      </section>

      {/* Delivery */}
      <section className="border-b border-orange-100 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
            Vous préparez. <span className="text-orange-600">On s&apos;occupe de la suite.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-gray-600">
            CVN&apos;EAT organise la prise en charge de la livraison pour vous laisser vous concentrer sur
            votre service.
          </p>
          <div className="mx-auto mt-10 flex max-w-lg items-center justify-center gap-3 text-sm font-bold text-gray-700 sm:gap-6">
            <span className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3">Restaurant</span>
            <span className="text-orange-400">→</span>
            <span className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3">Livreur</span>
            <span className="text-orange-400">→</span>
            <span className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3">Client</span>
          </div>
        </div>
      </section>

      {/* Form */}
      <section id="rejoindre" className="scroll-mt-24 border-b border-orange-100 bg-gradient-to-b from-orange-50/60 to-white py-16 sm:py-20">
        <div className="mx-auto max-w-xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
              Prêt à recevoir de nouvelles commandes ?
            </h2>
            <p className="mt-3 text-gray-600">
              Rejoignez CVN&apos;EAT. Notre équipe s&apos;occupe de vous accompagner.
            </p>
            <p className="mt-2 text-sm font-bold text-gray-900">{offerLine}</p>
          </div>

          {success ? (
            <div className="mt-10 rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
                <FaCheck />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Demande envoyée</h3>
              <p className="mt-2 text-sm text-gray-600">
                Merci ! Nous vous recontactons rapidement pour finaliser votre mise en ligne.
              </p>
              <button
                type="button"
                onClick={() => setSuccess(false)}
                className="mt-6 text-sm font-semibold text-orange-600 hover:underline"
              >
                Envoyer une autre demande
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-10 space-y-4 rounded-3xl border border-orange-100 bg-white p-6 shadow-lg shadow-orange-500/10 sm:p-8">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Site web</label>
                <input
                  name="website"
                  value={form.website}
                  onChange={onChange}
                  placeholder="https://…"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none ring-orange-500/30 focus:ring-2"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Nom du commerce <span className="text-orange-500">*</span>
                </label>
                <input
                  name="nom"
                  required
                  value={form.nom}
                  onChange={onChange}
                  placeholder="Ex. Chez Mario"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none ring-orange-500/30 focus:ring-2"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Ville <span className="text-orange-500">*</span>
                </label>
                <input
                  name="ville"
                  required
                  value={form.ville}
                  onChange={onChange}
                  placeholder="Ex. Ganges"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none ring-orange-500/30 focus:ring-2"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Votre nom <span className="text-orange-500">*</span>
                </label>
                <input
                  name="contact_name"
                  required
                  value={form.contact_name}
                  onChange={onChange}
                  placeholder="Prénom Nom"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none ring-orange-500/30 focus:ring-2"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Téléphone <span className="text-orange-500">*</span>
                </label>
                <input
                  name="telephone"
                  type="tel"
                  required
                  value={form.telephone}
                  onChange={onChange}
                  placeholder="06 12 34 56 78"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none ring-orange-500/30 focus:ring-2"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Email <span className="text-orange-500">*</span>
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={onChange}
                  placeholder="vous@restaurant.fr"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none ring-orange-500/30 focus:ring-2"
                />
              </div>

              {error ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3.5 text-base font-bold text-white hover:bg-orange-600 disabled:opacity-60"
              >
                {submitting ? 'Envoi…' : 'Rejoindre CVN’EAT'}
                {!submitting ? <FaArrowRight className="h-3.5 w-3.5" /> : null}
              </button>
              <p className="text-center text-xs text-gray-500">
                Commission 20 % · 0 € pour démarrer · Sans engagement
              </p>
            </form>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-24 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
            Questions fréquentes
          </h2>
          <div className="mt-10 divide-y divide-orange-100 rounded-2xl border border-orange-100 bg-white">
            {FAQ.map((item, idx) => {
              const open = openFaq === idx;
              return (
                <div key={item.q}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? -1 : idx)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="font-bold text-gray-900">{item.q}</span>
                    <FaChevronDown
                      className={`h-3.5 w-3.5 shrink-0 text-orange-500 transition-transform ${
                        open ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {open ? (
                    <p className="px-5 pb-5 text-sm leading-relaxed text-gray-600">{item.a}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="border-t border-orange-100 bg-gray-950 py-10 text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 sm:flex-row sm:items-center sm:px-6">
          <div>
            <p className="font-black">CVN&apos;EAT</p>
            <p className="mt-1 text-sm text-gray-400">La livraison locale qui vous régale.</p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-gray-300">
            <Link href="/" className="hover:text-white">
              Voir CVN&apos;EAT
            </Link>
            <Link href="/zones" className="hover:text-white">
              Zones de livraison
            </Link>
            <a href="mailto:contact@cvneat.fr" className="hover:text-white">
              contact@cvneat.fr
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
