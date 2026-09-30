'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  FaArrowRight,
  FaCheck,
  FaChevronDown,
  FaClock,
  FaMotorcycle,
  FaMoneyBillWave,
  FaMapMarkerAlt,
} from 'react-icons/fa';

const CvneatLogo = dynamic(() => import('@/components/CvneatLogo'), { ssr: false });

const FAQ = [
  {
    q: 'Combien puis-je gagner ?',
    a: 'Vous êtes payé à la course selon la distance (tarifs locaux CVN’EAT). Plus vous livrez, plus vous gagnez. Les gains sont suivis dans votre dashboard livreur.',
  },
  {
    q: 'Dois-je m’engager sur un volume d’heures ?',
    a: 'Non. Vous choisissez vos créneaux. Connectez-vous quand vous êtes disponible, déconnectez-vous quand vous avez fini.',
  },
  {
    q: 'Quel véhicule faut-il ?',
    a: 'Vélo, trottinette, scooter, moto ou voiture. Un permis valide est requis pour les véhicules motorisés.',
  },
  {
    q: 'Comment ça se passe après ma candidature ?',
    a: 'Notre équipe vérifie votre dossier. Une fois accepté, vous recevez un email et accédez au dashboard livreur pour commencer les courses.',
  },
  {
    q: 'Où livre-t-on ?',
    a: 'Autour de Ganges et des communes desservies (Cévennes). Voir la page Zones pour le détail.',
  },
];

function scrollTo(id) {
  if (typeof document === 'undefined') return;
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function BecomeDeliveryPage() {
  const [openFaq, setOpenFaq] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    ville: '',
    vehicleType: 'bike',
    availability: 'Soirs & week-ends',
  });

  const offerLine = useMemo(() => 'Flexible · Payé à la course · Zone locale', []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/delivery/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Échec de l’envoi');
      setSuccess(true);
      setForm({
        prenom: '',
        nom: '',
        email: '',
        telephone: '',
        ville: '',
        vehicleType: 'bike',
        availability: 'Soirs & week-ends',
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
            Devenir livreur
            <FaArrowRight className="h-3 w-3" />
          </button>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-orange-100 bg-gradient-to-b from-orange-50/80 via-white to-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-20">
          <div>
            <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.18em] text-orange-600">
              CVN&apos;EAT pour les livreurs
            </p>
            <h1 className="text-4xl font-black leading-[1.08] tracking-tight text-gray-900 sm:text-5xl lg:text-[3.25rem]">
              Livrez près de chez vous.{' '}
              <span className="text-orange-600">Gagnez à votre rythme.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-gray-600 sm:text-lg">
              Rejoignez l&apos;équipe locale CVN&apos;EAT : courses flexibles, paiements suivis, zone
              Cévennes.
            </p>
            <p className="mt-4 text-base font-bold text-gray-900 sm:text-lg">{offerLine}</p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => scrollTo('rejoindre')}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3.5 text-base font-bold text-white shadow-md shadow-orange-500/25 hover:bg-orange-600"
              >
                Postuler maintenant
                <FaArrowRight className="h-3.5 w-3.5" />
              </button>
              <Link
                href="/login?redirect=/delivery/dashboard"
                className="text-sm font-semibold text-gray-600 underline-offset-4 hover:text-orange-600 hover:underline"
              >
                Déjà livreur ? Se connecter
              </Link>
            </div>
            <p className="mt-5 text-sm text-gray-500">Vélo, trottinette, scooter, moto ou voiture.</p>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -left-2 top-6 z-10 rounded-xl border border-orange-100 bg-white px-3 py-2 text-xs font-semibold text-gray-800 shadow-md sm:-left-6">
              Nouvelle course <span className="text-orange-600">+5,00 €</span>
            </div>
            <div className="absolute -right-1 top-24 z-10 rounded-xl border border-orange-100 bg-white px-3 py-2 text-xs font-semibold text-gray-800 shadow-md sm:-right-4">
              Pick-up prêt <FaCheck className="ml-1 inline text-green-500" />
            </div>
            <div className="absolute bottom-16 left-0 z-10 rounded-xl border border-orange-100 bg-white px-3 py-2 text-xs font-semibold text-gray-800 shadow-md sm:-left-4">
              Client à 1,2 km
            </div>

            <div className="relative -rotate-1 rounded-3xl bg-gray-900 p-5 text-white shadow-2xl shadow-orange-500/20 sm:-rotate-2 sm:p-6">
              <div className="mb-4 flex items-center justify-between text-sm text-gray-300">
                <span>Course disponible</span>
                <span className="font-mono text-xs">#3921</span>
              </div>
              <p className="text-4xl font-black tracking-tight">5,00 €</p>
              <p className="mt-1 text-sm text-gray-400">Ton gain net</p>
              <div className="mt-5 flex items-center gap-2 text-sm">
                <FaMapMarkerAlt className="text-orange-400" />
                <span className="text-gray-300">Ganges → Laroque · ~10 min</span>
              </div>
              <div className="mt-4 grid gap-2">
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                  Restaurant : prêt
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                  Distance : 3,4 km
                </div>
              </div>
              <button
                type="button"
                className="mt-5 w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white"
              >
                Accepter la course
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="offre" className="scroll-mt-24 border-b border-orange-100 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.18em] text-orange-600">
            Une offre simple
          </p>
          <h2 className="max-w-3xl text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
            Travaillez quand vous voulez.{' '}
            <span className="text-orange-600">Soyez payé pour chaque course.</span>
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { k: 'Flexible', v: 'Vos horaires', icon: FaClock },
              { k: 'Local', v: 'Zone Cévennes', icon: FaMapMarkerAlt },
              { k: 'À la course', v: 'Gains suivis', icon: FaMoneyBillWave },
            ].map((item) => (
              <div
                key={item.k}
                className="rounded-2xl border border-orange-100 bg-orange-50/50 px-6 py-8 text-center"
              >
                <item.icon className="mx-auto mb-3 h-6 w-6 text-orange-600" />
                <p className="text-3xl font-black text-orange-600 sm:text-4xl">{item.k}</p>
                <p className="mt-2 text-sm font-semibold text-gray-600">{item.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="comment" className="scroll-mt-24 border-b border-orange-100 bg-gradient-to-b from-orange-50/40 to-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.18em] text-orange-600">
            Comment ça marche
          </p>
          <h2 className="max-w-3xl text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
            De la candidature à votre première course.
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                n: '01',
                title: 'Postulez en 1 minute',
                text: 'Vous nous laissez vos coordonnées et votre véhicule.',
              },
              {
                n: '02',
                title: 'On valide votre dossier',
                text: 'Notre équipe vérifie et active votre accès livreur.',
              },
              {
                n: '03',
                title: 'Livrez & gagnez',
                text: 'Acceptez les courses autour de chez vous quand vous êtes dispo.',
              },
            ].map((step) => (
              <div key={step.n} className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-black text-orange-500">{step.n}</span>
                  <FaMotorcycle className="h-5 w-5 text-orange-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">{step.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="rejoindre" className="scroll-mt-24 border-b border-orange-100 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
              Prêt à livrer avec CVN&apos;EAT ?
            </h2>
            <p className="mt-3 text-gray-600">Laissez vos infos, on vous recontacte rapidement.</p>
            <p className="mt-2 text-sm font-bold text-gray-900">{offerLine}</p>
          </div>

          {success ? (
            <div className="mt-10 rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
                <FaCheck />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Candidature envoyée</h3>
              <p className="mt-2 text-sm text-gray-600">
                Merci ! Nous étudions votre dossier et vous répondons bientôt.
              </p>
              <button
                type="button"
                onClick={() => setSuccess(false)}
                className="mt-6 text-sm font-semibold text-orange-600 hover:underline"
              >
                Envoyer une autre candidature
              </button>
            </div>
          ) : (
            <form
              onSubmit={onSubmit}
              className="mt-10 space-y-4 rounded-3xl border border-orange-100 bg-white p-6 shadow-lg shadow-orange-600/10 sm:p-8"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Prénom <span className="text-orange-500">*</span>
                  </label>
                  <input
                    name="prenom"
                    required
                    value={form.prenom}
                    onChange={onChange}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none ring-orange-500/30 focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">Nom</label>
                  <input
                    name="nom"
                    value={form.nom}
                    onChange={onChange}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none ring-orange-500/30 focus:ring-2"
                  />
                </div>
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
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none ring-orange-500/30 focus:ring-2"
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
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none ring-orange-500/30 focus:ring-2"
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
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none ring-orange-500/30 focus:ring-2"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Véhicule</label>
                <select
                  name="vehicleType"
                  value={form.vehicleType}
                  onChange={onChange}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none ring-orange-500/30 focus:ring-2"
                >
                  <option value="bike">Vélo</option>
                  <option value="trotinette">Trottinette</option>
                  <option value="scooter">Scooter</option>
                  <option value="motorcycle">Moto</option>
                  <option value="car">Voiture</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Disponibilités</label>
                <input
                  name="availability"
                  value={form.availability}
                  onChange={onChange}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none ring-orange-500/30 focus:ring-2"
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
                {submitting ? 'Envoi…' : 'Postuler'}
                {!submitting ? <FaArrowRight className="h-3.5 w-3.5" /> : null}
              </button>
            </form>
          )}
        </div>
      </section>

      <section id="faq" className="scroll-mt-24 bg-gradient-to-b from-orange-50/50 to-white py-16 sm:py-20">
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
            <p className="mt-1 text-sm text-gray-400">Livraison locale · Cévennes</p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-gray-300">
            <Link href="/" className="hover:text-white">
              Voir CVN&apos;EAT
            </Link>
            <Link href="/devenir-partenaire" className="hover:text-white">
              Restaurants
            </Link>
            <Link href="/zones" className="hover:text-white">
              Zones
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
