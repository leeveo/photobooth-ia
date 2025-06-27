'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';

// Remise de 20% sur l'annuel
const DISCOUNT = 0.2;

const PLANS = [
	{
		name: 'Starter',
		price: 10,
		annualPrice: 10 * 12 * (1 - DISCOUNT),
		priceId: {
			monthly: 'price_1RdtbBIgKYOzHnxEwrDVPJdI',
			yearly: 'price_1RdtbBIgKYOzHnxEwrDVPJdI_annual', // Remplace par ton vrai price_id annuel
		},
		quota: 100,
		description: '100 photos / mois',
		features: [
			'Génération IA illimitée',
			'Support standard',
			'Accès web uniquement',
		],
		cardDesc: "Idéal pour une expérience photo ludique lors d'événements et de fêtes du quotidien.",
	},
	{
		name: 'Pro',
		price: 29,
		annualPrice: 29 * 12 * (1 - DISCOUNT),
		priceId: {
			monthly: 'price_1RdtbYIgKYOzHnxE7NSZjxCP',
			yearly: 'price_1RdtbYIgKYOzHnxE7NSZjxCP_annual', // Remplace par ton vrai price_id annuel
		},
		quota: 500,
		description: '500 photos / mois',
		features: [
			'Toutes les fonctionnalités Starter',
			'Support prioritaire',
			'API dédiée',
			'Personnalisation avancée',
		],
		cardDesc: "Parfait pour les professionnels souhaitant automatiser et personnaliser leurs animations photo.",
	},
	{
		name: 'Entreprise',
		price: 99,
		annualPrice: 99 * 12 * (1 - DISCOUNT),
		priceId: {
			monthly: 'price_xxx3',
			yearly: 'price_xxx3_annual', // Remplace par ton vrai price_id annuel
		},
		quota: 5000,
		description: '5000 photos / mois',
		features: [
			'Toutes les fonctionnalités Pro',
			'Gestion multi-utilisateurs',
			'SLA 99.9%',
			'Support 24/7',
			'Intégrations avancées',
		],
		cardDesc: "Conçu pour les entreprises exigeantes avec besoins avancés, support dédié et intégrations sur mesure.",
	},
];

// Liste exhaustive des features pour le tableau comparatif
const ALL_FEATURES = [
	'Génération IA illimitée',
	'Support standard',
	'Accès web uniquement',
	'Support prioritaire',
	'API dédiée',
	'Personnalisation avancée',
	'Gestion multi-utilisateurs',
	'SLA 99.9%',
	'Support 24/7',
	'Intégrations avancées',
];

export default function ChoosePlanPage() {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [billing, setBilling] = useState('monthly'); // 'monthly' ou 'yearly'

	const handleSubscribe = async (priceId) => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch('/api/create-checkout-session', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ priceId }),
			});
			const data = await res.json();
			if (!res.ok)
				throw new Error(data.error || 'Erreur lors de la création de la session Stripe');
			const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
			await stripe.redirectToCheckout({ sessionId: data.sessionId });
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white py-16 px-4">
			<div className="max-w-4xl mx-auto text-center mb-12">
				<h1 className="text-4xl md:text-5xl font-extrabold text-indigo-700 mb-4 drop-shadow-lg">
					Découvrez nos offres et boostez votre photobooth IA 🚀
				</h1>
				<p className="text-lg md:text-xl text-gray-600">
					Choisissez le plan qui correspond à vos besoins et profitez de toutes les fonctionnalités de notre plateforme.
				</p>
			</div>

			<div className="flex justify-center mb-10">
				<div className="inline-flex items-center bg-white rounded-full shadow px-2 py-1">
					<button
						className={`px-4 py-2 rounded-full font-semibold transition ${
							billing === 'monthly'
								? 'bg-indigo-600 text-white'
								: 'text-indigo-600 hover:bg-indigo-100'
						}`}
						onClick={() => setBilling('monthly')}
						disabled={billing === 'monthly'}
					>
						Mensuel
					</button>
					<button
						className={`px-4 py-2 rounded-full font-semibold transition ${
							billing === 'yearly'
								? 'bg-indigo-600 text-white'
								: 'text-indigo-600 hover:bg-indigo-100'
						}`}
						onClick={() => setBilling('yearly')}
						disabled={billing === 'yearly'}
					>
						Annuel{' '}
						<span className="ml-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
							-20%
						</span>
					</button>
				</div>
			</div>

			{error && <div className="mb-4 text-red-600 text-center">{error}</div>}

			<div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
				{PLANS.map((plan, idx) => (
					<div
						key={plan.name}
						className={`relative bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center border-2 ${
							idx === 1
								? 'border-indigo-600 scale-105 z-10'
								: 'border-gray-200'
						} transition-transform`}
					>
						{idx === 1 && (
							<span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs px-4 py-1 rounded-full shadow">
								Populaire
							</span>
						)}
						<h2 className="text-2xl font-bold mb-2 text-indigo-700">{plan.name}</h2>
						<div className="flex items-end mb-2">
							<span className="text-4xl font-extrabold text-gray-900">
								{billing === 'monthly'
									? plan.price
									: Math.round(plan.annualPrice)}
								€
							</span>
							<span className="ml-2 text-gray-500 font-medium text-lg">
								/{billing === 'monthly' ? 'mois' : 'an'}
							</span>
						</div>
						<div className="mb-4 text-gray-500">{plan.description}</div>
						<div className="mb-4 text-sm text-gray-700 text-center">{plan.cardDesc}</div>
						<ul className="mb-6 text-left w-full space-y-2">
							{plan.features.map((feature, i) => (
								<li key={i} className="flex items-center">
									<svg
										className="w-5 h-5 text-green-500 mr-2"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M5 13l4 4L19 7"
										/>
									</svg>
									<span>{feature}</span>
								</li>
							))}
						</ul>
						<button
							onClick={() => handleSubscribe(plan.priceId[billing])}
							disabled={loading}
							className={`w-full py-3 rounded-xl font-bold text-lg transition ${
								idx === 1
									? 'bg-indigo-600 text-white hover:bg-indigo-700'
									: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
							} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
						>
							{loading ? 'Redirection...' : 'Choisir'}
						</button>
					</div>
				))}
			</div>

			<div className="max-w-3xl mx-auto mt-16 text-center">
				<h3 className="text-2xl font-bold text-indigo-700 mb-4">
					Quel plan choisir ?
				</h3>
				<p className="text-gray-700 text-lg mb-2">
					<span className="font-semibold text-indigo-600">Starter</span> est idéal
					pour découvrir la génération IA et lancer vos premiers événements.
				</p>
				<p className="text-gray-700 text-lg mb-2">
					<span className="font-semibold text-indigo-600">Pro</span> convient aux
					professionnels qui souhaitent automatiser et personnaliser leur expérience.
				</p>
				<p className="text-gray-700 text-lg">
					<span className="font-semibold text-indigo-600">Entreprise</span> est conçu
					pour les organisations exigeantes, avec un support dédié et des intégrations
					avancées.
				</p>
			</div>

			{/* Tableau comparatif des plans */}
			<div className="overflow-x-auto max-w-5xl mx-auto mt-12 mb-24">
				<table className="min-w-full border-collapse bg-white rounded-xl shadow">
					<thead>
						<tr>
							<th className="py-3 px-4 bg-indigo-50 text-left font-bold text-indigo-700 text-lg rounded-tl-xl">Fonctionnalités</th>
							{PLANS.map(plan => (
								<th key={plan.name} className="py-3 px-4 bg-indigo-50 text-center font-bold text-indigo-700 text-lg">
									{plan.name}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{ALL_FEATURES.map((feature, i) => (
							<tr key={feature} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
								<td className="py-2 px-4 text-left text-gray-700 border-t">{feature}</td>
								{PLANS.map(plan => (
									<td
										key={plan.name}
										className="py-2 px-4 border-t"
									>
										<div className="flex justify-center">
											{plan.features.includes(feature) ||
											(plan.name === 'Pro' && feature === 'Génération IA illimitée') ||
											(plan.name === 'Entreprise' && (
												feature === 'Génération IA illimitée' ||
												feature === 'Support standard' ||
												feature === 'Accès web uniquement' ||
												feature === 'Support prioritaire' ||
												feature === 'API dédiée' ||
												feature === 'Personnalisation avancée'
											))
												? <span className="inline-block w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-lg">✅</span>
												: ''}
										</div>
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* Encart Discord */}
			<div className="flex justify-center mb-10">
				<div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center max-w-xl w-full">
					<img
						src="/discord.png"
						alt="Rejoignez notre communauté Discord"
						className="w-340 h-40 object-cover rounded-xl mb-4 shadow"
					/>
					<div className="text-lg font-semibold text-indigo-700 mb-2">
						Rejoignez la communauté sur Discord !
					</div>
					<p className="text-gray-600 text-center mb-2">
						Partagez vos idées, posez vos questions et échangez avec d'autres utilisateurs de Photobooth IA.
					</p>
					<a
						href="https://discord.com/" // Remplace par ton vrai lien Discord si besoin
						target="_blank"
						rel="noopener noreferrer"
						className="mt-2 inline-block bg-indigo-600 text-white px-5 py-2 rounded-full font-bold hover:bg-indigo-700 transition"
					>
						Rejoindre le Discord
					</a>
				</div>
			</div>
		</div>
	);
}
