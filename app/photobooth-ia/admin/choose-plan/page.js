'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { getStripePrices, getStripeAddons } from './stripe-config';

// Remise de 20% sur l'annuel
const DISCOUNT = 0.2;

// Fonction pour générer les packs d'addons avec les bons Price IDs
const generateAddonPacks = () => {
	const addons = getStripeAddons();
	
	return [
		{
			id: 'addon-100',
			name: 'Pack +100 Photos',
			photos: 100,
			price: 9.90,
			priceId: addons.pack100,
			description: 'Ajoutez 100 photos supplémentaires à votre quota actuel',
			popular: false,
			icon: '📸'
		},
		{
			id: 'addon-500', 
			name: 'Pack +500 Photos',
			photos: 500,
			price: 39.90,
			priceId: addons.pack500,
			description: 'Ajoutez 500 photos supplémentaires à votre quota actuel',
			popular: true,
			icon: '🚀'
		},
		{
			id: 'addon-1000',
			name: 'Pack +1000 Photos', 
			photos: 1000,
			price: 79.90,
			priceId: addons.pack1000,
			description: 'Ajoutez 1000 photos supplémentaires à votre quota actuel',
			popular: false,
			icon: '💎'
		}
	];
};

const ADDON_PACKS = generateAddonPacks();

// Fonction pour générer les plans avec les bons Price IDs selon l'environnement
const generatePlans = () => {
	// Utiliser la configuration automatique selon l'environnement
	const prices = getStripePrices();
	
	console.log('[CHOOSE-PLAN] Using Price IDs from config:', prices);
	
	return [
		{
			name: 'Start',
			price: 19,
			annualPrice: 19 * 12 * (1 - DISCOUNT),
			priceId: {
				monthly: prices.start,
				yearly: prices.start + '_annual', // À créer pour l'abonnement annuel
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
			name: 'Essentiel',
			price: 49,
			annualPrice: 49 * 12 * (1 - DISCOUNT),
			priceId: {
				monthly: prices.essentiel,
				yearly: prices.essentiel + '_annual', // À créer pour l'abonnement annuel
			},
			quota: 400,
			description: '400 photos / mois',
			features: [
				'Toutes les fonctionnalités Start',
				'Support prioritaire',
				'API dédiée',
			],
			cardDesc: "Parfait pour les événements réguliers et les petites entreprises.",
		},
		{
			name: 'Pro',
			price: 89,
			annualPrice: 89 * 12 * (1 - DISCOUNT),
			priceId: {
				monthly: prices.pro,
				yearly: prices.pro + '_annual', // À créer pour l'abonnement annuel
			},
			quota: 1000,
			description: '1000 photos / mois',
			features: [
				'Toutes les fonctionnalités Essentiel',
				'Personnalisation avancée',
				'Gestion multi-utilisateurs',
				'SLA 99.9%',
			],
			cardDesc: "Conçu pour les professionnels souhaitant automatiser et personnaliser leurs animations photo.",
		},
		{
			name: 'Premium',
			price: 119,
			annualPrice: 119 * 12 * (1 - DISCOUNT),
			priceId: {
				monthly: prices.premium,
				yearly: prices.premium + '_annual', // À créer pour l'abonnement annuel
			},
			quota: 1500,
			description: '1500 photos / mois',
			features: [
				'Toutes les fonctionnalités Pro',
				'Support 24/7',
				'Intégrations avancées',
				'Accès prioritaire aux nouvelles fonctionnalités',
			],
			cardDesc: "Solution premium pour les entreprises exigeantes avec besoins avancés et support dédié.",
		}
	];
};

const PLANS = generatePlans();

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
	'Accès prioritaire aux nouvelles fonctionnalités',
];

export default function ChoosePlanPage() {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [billing, setBilling] = useState('monthly'); // 'monthly' ou 'yearly'
	const [showAddonPacks, setShowAddonPacks] = useState(false);
	const [successMessage, setSuccessMessage] = useState('');
	const [showTestSection, setShowTestSection] = useState(false);
	const [hasActivePlan, setHasActivePlan] = useState(false);
	const [quotaLoading, setQuotaLoading] = useState(true);

	// Vérifier les paramètres URL pour les messages
	useEffect(() => {
		if (typeof window !== 'undefined') {
			const urlParams = new URLSearchParams(window.location.search);
			if (urlParams.get('addon_success') === 'true') {
				setSuccessMessage('🎉 Pack de photos acheté avec succès ! Votre quota a été mis à jour.');
				setShowAddonPacks(true); // Ouvrir la section des packs
				// Nettoyer l'URL après un délai
				setTimeout(() => {
					window.history.replaceState({}, '', window.location.pathname);
				}, 3000);
			} else if (urlParams.get('addon_canceled') === 'true') {
				setError('Achat annulé. Vous pouvez essayer à nouveau si vous le souhaitez.');
				setShowAddonPacks(true);
				setTimeout(() => {
					window.history.replaceState({}, '', window.location.pathname);
					setError(null);
				}, 5000);
			}
		}
	}, []);

	// Vérifier si l'utilisateur a un plan payant actif
	useEffect(() => {
		const checkActivePlan = async () => {
			setQuotaLoading(true);
			try {
				// Récupérer l'admin ID de la session
				let adminUserId = localStorage.getItem('currentAdminId') 
					|| localStorage.getItem('adminUserId')
					|| localStorage.getItem('admin_user_id')
					|| localStorage.getItem('userId')
					|| localStorage.getItem('user_id');

				// Essayer de décoder admin_session
				if (!adminUserId) {
					const adminSession = localStorage.getItem('admin_session');
					if (adminSession) {
						try {
							const decodedSession = JSON.parse(atob(adminSession));
							adminUserId = decodedSession.userId || decodedSession.user_id || decodedSession.id;
						} catch (e) {
							// Erreur silencieuse lors du décodage
						}
					}
				}

				if (!adminUserId) {
					setHasActivePlan(false);
					setQuotaLoading(false);
					return;
				}

				// Appeler l'API quota-manager pour vérifier le plan
				const response = await fetch('/api/quota-manager', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ adminId: adminUserId, action: 'check' })
				});

				if (response.ok) {
					const quotaData = await response.json();
					
					// L'utilisateur a un plan payant s'il n'est PAS sur le plan gratuit
					const hasPayingPlan = !quotaData.monthly.isFreePlan && quotaData.monthly.quota > 3;
					setHasActivePlan(hasPayingPlan);
				} else {
					setHasActivePlan(false);
				}
			} catch (error) {
				setHasActivePlan(false);
			} finally {
				setQuotaLoading(false);
			}
		};

		checkActivePlan();
	}, []);

	const handleSubscribe = async (priceId) => {
		setLoading(true);
		setError(null);
		try {
			// Récupérer l'ID utilisateur connecté
			let adminUserId = localStorage.getItem('currentAdminId') 
				|| localStorage.getItem('adminUserId')
				|| sessionStorage.getItem('adminUserId')
				|| localStorage.getItem('userId')
				|| sessionStorage.getItem('userId');

			// Essayer de décoder admin_session
			if (!adminUserId) {
				const adminSession = localStorage.getItem('admin_session') || sessionStorage.getItem('admin_session');
				if (adminSession) {
					try {
						let decodedSession = atob(adminSession);
						decodedSession = JSON.parse(decodedSession);
						adminUserId = decodedSession.userId || decodedSession.user_id || decodedSession.id;
					} catch (e) {
						console.warn('Cannot decode admin_session');
					}
				}
			}

			if (!adminUserId) {
				setError('Utilisateur non connecté. Veuillez vous reconnecter.');
				return;
			}

			console.log('[CHOOSE-PLAN] Creating checkout session with adminId:', adminUserId);

			const res = await fetch('/api/create-checkout-session', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					priceId, 
					adminId: adminUserId 
				}),
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

	const handleAddonPurchase = async (pack) => {
		setLoading(true);
		setError(null);
		
		try {
			// Récupérer l'admin_user_id exactement comme dans handleTestQuota
			let adminUserId = localStorage.getItem('currentAdminId') 
				|| localStorage.getItem('adminUserId')
				|| localStorage.getItem('admin_user_id')
				|| localStorage.getItem('userId')
				|| localStorage.getItem('user_id');

			// Essayer de décoder admin_session
			if (!adminUserId) {
				const adminSession = localStorage.getItem('admin_session');
				if (adminSession) {
					try {
						const decodedSession = JSON.parse(atob(adminSession));
						adminUserId = decodedSession.userId || decodedSession.user_id || decodedSession.id;
					} catch (e) {
						// Erreur silencieuse
					}
				}
			}

			if (!adminUserId) {
				throw new Error('Impossible de récupérer l\'ID administrateur. Veuillez vous reconnecter.');
			}

			const res = await fetch('/api/create-addon-checkout-session', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					priceId: pack.priceId,
					addonType: 'photo_pack',
					addonValue: pack.photos,
					addonName: pack.name,
					adminId: adminUserId
				}),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Erreur lors de la création de la session Stripe');
			}

			const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
			
			if (!stripe) {
				throw new Error('Stripe n\'a pas pu être chargé');
			}

			const result = await stripe.redirectToCheckout({ sessionId: data.sessionId });
			
			if (result.error) {
				throw new Error(result.error.message);
			}

		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	// Fonction de test pour ajouter du quota manuellement
	const handleTestQuota = async () => {
		// Récupérer l'admin ID
		let adminUserId = localStorage.getItem('currentAdminId') 
			|| localStorage.getItem('adminUserId')
			|| localStorage.getItem('admin_user_id')
			|| localStorage.getItem('userId')
			|| localStorage.getItem('user_id');

		// Essayer de décoder admin_session
		if (!adminUserId) {
			const adminSession = localStorage.getItem('admin_session');
			if (adminSession) {
				try {
					// Décoder le base64
					const decodedSession = JSON.parse(atob(adminSession));
					adminUserId = decodedSession.userId || decodedSession.user_id || decodedSession.id;
				} catch (e) {
					// Erreur silencieuse
				}
			}
		}

		// Si toujours pas trouvé, essayer de parser d'autres objets JSON
		if (!adminUserId) {
			const adminData = localStorage.getItem('adminData') || localStorage.getItem('user');
			if (adminData) {
				try {
					const parsed = JSON.parse(adminData);
					adminUserId = parsed.id || parsed.user_id || parsed.admin_id;
				} catch (e) {
					// Erreur silencieuse
				}
			}
		}

		// Si toujours pas trouvé, utiliser l'ID de la session décodée manuellement
		if (!adminUserId) {
			adminUserId = 'bb70d283-b02e-4e22-9d06-a705952b366b'; // ID from decoded admin_session
		}

		if (!adminUserId) {
			setError('Admin User ID non trouvé. ID from session: bb70d283-b02e-4e22-9d06-a705952b366b (voir console pour debug)');
			return;
		}

		setLoading(true);
		try {
			const res = await fetch('/api/test-add-quota', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					adminUserId,
					addonValue: 100,
					packName: 'Pack +100 Photos (Test Local)'
				})
			});

			const data = await res.json();
			
			if (res.ok) {
				setSuccessMessage('🧪 Test réussi ! +100 photos ajoutées à votre quota.');
			} else {
				setError(`Erreur test: ${data.error || 'Erreur inconnue'}`);
			}
		} catch (err) {
			setError(`Erreur test: ${err.message}`);
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
			{successMessage && (
				<div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg text-center">
					{successMessage}
				</div>
			)}

			{/* Section de test pour environnement local */}
			{process.env.NODE_ENV === 'development' && (
				<div className="mb-8 max-w-2xl mx-auto">
					<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
						<div className="flex items-center justify-between mb-2">
							<h3 className="font-semibold text-yellow-800">🧪 Mode Développement</h3>
							<button
								onClick={() => setShowTestSection(!showTestSection)}
								className="text-yellow-600 hover:text-yellow-800"
							>
								{showTestSection ? 'Masquer' : 'Afficher'} les tests
							</button>
						</div>
						
						{showTestSection && (
							<div className="mt-4 space-y-3">
								<p className="text-sm text-yellow-700">
									Votre serveur localhost a des problèmes de connexion. 
									Utilisez ce bouton pour tester l'ajout de quota manuellement :
								</p>
								
								<div className="flex gap-2">
									<button
										onClick={() => {
											console.clear();
											console.log('🔍 Debug localStorage:');
											for (let i = 0; i < localStorage.length; i++) {
												const key = localStorage.key(i);
												console.log(`${key}:`, localStorage.getItem(key));
											}
											alert('Informations affichées dans la console (F12)');
										}}
										className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-gray-700"
									>
										🔍 Debug localStorage
									</button>
									
									<button
										onClick={handleTestQuota}
										disabled={loading}
										className="flex-1 bg-yellow-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-yellow-700 disabled:opacity-50"
									>
										{loading ? 'Test en cours...' : '🧪 +100 photos test'}
									</button>
								</div>
							</div>
						)}
					</div>
				</div>
			)}

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
				{PLANS.map((plan, idx) => (
					<div
						key={plan.name}
						className={`relative bg-white rounded-3xl shadow-xl p-6 flex flex-col items-center border-2 ${
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
						<h2 className="text-xl font-bold mb-2 text-indigo-700">{plan.name}</h2>
						<div className="flex items-end mb-2">
							<span className="text-3xl font-extrabold text-gray-900">
								{billing === 'monthly'
									? plan.price
									: Math.round(plan.annualPrice)}
								€
							</span>
							<span className="ml-2 text-gray-500 font-medium text-sm">
								/{billing === 'monthly' ? 'mois' : 'an'}
							</span>
						</div>
						<div className="mb-3 text-gray-500 text-sm">{plan.description}</div>
						<div className="mb-4 text-xs text-gray-700 text-center">{plan.cardDesc}</div>
						<ul className="mb-6 text-left w-full space-y-1">
							{plan.features.map((feature, i) => (
								<li key={i} className="flex items-start">
									<svg
										className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0"
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
									<span className="text-sm">{feature}</span>
								</li>
							))}
						</ul>
						<button
							onClick={() => handleSubscribe(plan.priceId[billing])}
							disabled={loading}
							className={`w-full py-3 rounded-xl font-bold text-sm transition ${
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

			<div className="max-w-4xl mx-auto mt-16 text-center">
				<h3 className="text-2xl font-bold text-indigo-700 mb-4">
					Quel plan choisir ?
				</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
					<p className="text-gray-700 text-lg">
						<span className="font-semibold text-indigo-600">Start</span> est idéal
						pour découvrir la génération IA et lancer vos premiers événements.
					</p>
					<p className="text-gray-700 text-lg">
						<span className="font-semibold text-indigo-600">Essentiel</span> convient 
						aux événements réguliers et petites entreprises avec plus de volume.
					</p>
					<p className="text-gray-700 text-lg">
						<span className="font-semibold text-indigo-600">Pro</span> est parfait pour 
						les professionnels avec personnalisation avancée et gestion multi-utilisateurs.
					</p>
					<p className="text-gray-700 text-lg">
						<span className="font-semibold text-indigo-600">Premium</span> est conçu
						pour les entreprises exigeantes avec support 24/7 et accès prioritaire.
					</p>
				</div>
			</div>

			{/* Tableau comparatif des plans */}
			<div className="overflow-x-auto max-w-7xl mx-auto mt-12 mb-24">
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
											(plan.name === 'Essentiel' && feature === 'Génération IA illimitée') ||
											(plan.name === 'Pro' && (
												feature === 'Génération IA illimitée' ||
												feature === 'Support standard' ||
												feature === 'Accès web uniquement' ||
												feature === 'Support prioritaire' ||
												feature === 'API dédiée'
											)) ||
											(plan.name === 'Premium' && (
												feature === 'Génération IA illimitée' ||
												feature === 'Support standard' ||
												feature === 'Accès web uniquement' ||
												feature === 'Support prioritaire' ||
												feature === 'API dédiée' ||
												feature === 'Personnalisation avancée' ||
												feature === 'Gestion multi-utilisateurs' ||
												feature === 'SLA 99.9%'
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

			{/* Section Packs Supplémentaires - SEULEMENT pour les utilisateurs avec plan payant */}
			{hasActivePlan && (
				<div id="addon-packs" className="max-w-6xl mx-auto mt-16 mb-16">
					<div className="text-center mb-12">
						<h2 className="text-3xl md:text-4xl font-extrabold text-indigo-700 mb-4">
							Besoin de plus de photos ? 📸
						</h2>
						<p className="text-lg text-gray-600 mb-6">
							Vous avez déjà un plan mais besoin de photos supplémentaires ? Achetez des packs d'images ponctuels !
						</p>
						<button
							onClick={() => setShowAddonPacks(!showAddonPacks)}
							className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-8 py-3 rounded-full font-bold text-lg hover:from-purple-600 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg"
						>
							{showAddonPacks ? 'Masquer les packs' : 'Voir les packs supplémentaires'} 
							<span className="ml-2">{showAddonPacks ? '🔼' : '🔽'}</span>
						</button>
					</div>

					{showAddonPacks && (
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							{ADDON_PACKS.map((pack, idx) => (
								<div
									key={pack.id}
									className={`relative bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg p-6 border-2 transition-all hover:shadow-xl hover:scale-105 ${
										pack.popular 
											? 'border-purple-400 ring-2 ring-purple-200' 
											: 'border-gray-200'
									}`}
								>
									{pack.popular && (
										<span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-xs px-4 py-1 rounded-full shadow">
											Populaire
										</span>
									)}
									
									<div className="text-center">
										<div className="text-4xl mb-3">{pack.icon}</div>
										<h3 className="text-xl font-bold text-gray-800 mb-2">{pack.name}</h3>
										<div className="flex items-center justify-center mb-3">
											<span className="text-3xl font-extrabold text-purple-600">{pack.price}€</span>
											<span className="ml-2 text-gray-500">une seule fois</span>
										</div>
										<p className="text-gray-600 text-sm mb-4">{pack.description}</p>
										
										<div className="bg-purple-50 rounded-lg p-3 mb-4">
											<div className="text-purple-700 font-semibold">
												+{pack.photos} photos
											</div>
											<div className="text-purple-600 text-sm">
												Ajoutées à votre quota actuel
											</div>
										</div>

										<button
											onClick={() => handleAddonPurchase(pack)}
											disabled={loading}
											className={`w-full py-3 rounded-xl font-bold text-lg transition ${
												pack.popular
													? 'bg-purple-600 text-white hover:bg-purple-700'
													: 'bg-purple-100 text-purple-700 hover:bg-purple-200'
											} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
										>
											{loading ? 'Redirection...' : 'Acheter maintenant'}
										</button>
									</div>
								</div>
							))}
						</div>
					)}

					{showAddonPacks && (
						<div className="mt-8 text-center">
							<div className="bg-blue-50 rounded-xl p-6 max-w-2xl mx-auto">
								<h4 className="text-lg font-semibold text-blue-800 mb-2">💡 Comment ça marche ?</h4>
								<ul className="text-blue-700 text-sm space-y-1">
									<li>• Les photos achetées s'ajoutent à votre quota mensuel existant</li>
									<li>• Elles ne sont pas perdues à la fin du mois</li>
									<li>• Parfait pour les événements exceptionnels ou les pics d'activité</li>
									<li>• Achat ponctuel, aucun engagement supplémentaire</li>
								</ul>
							</div>
						</div>
					)}
				</div>
			)}

			{/* Message informatif pour les utilisateurs sans plan payant */}
			{!hasActivePlan && !quotaLoading && (
				<div className="max-w-4xl mx-auto mt-16 mb-16">
					<div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-8 text-center">
						<div className="text-4xl mb-4">🔒</div>
						<h3 className="text-2xl font-bold text-amber-700 mb-4">
							Packs d'images supplémentaires
						</h3>
						<p className="text-amber-600 text-lg mb-6">
							Les packs d'images supplémentaires sont exclusivement réservés aux utilisateurs avec un plan payant actif.
						</p>
						<p className="text-amber-600 mb-6">
							Souscrivez d'abord à un plan ci-dessus pour accéder aux packs addon !
						</p>
						<div className="inline-flex items-center text-amber-700 bg-amber-100 px-4 py-2 rounded-lg">
							<span className="text-sm font-medium">💡 Astuce : Commencez par le plan Start pour débloquer cette fonctionnalité</span>
						</div>
					</div>
				</div>
			)}

			{/* Encart Discord - Déplacé en bas */}
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