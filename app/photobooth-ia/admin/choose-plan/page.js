'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';

// Remise de 20% sur l'annuel
const DISCOUNT = 0.2;

// Packs d'images supplémentaires
const ADDON_PACKS = [
	{
		id: 'addon-100',
		name: 'Pack +100 Photos',
		photos: 100,
		price: 9.90,
		priceId: 'price_1S9K5gIgKYOzHnxE8pKcberV', // À créer dans Stripe
		description: 'Ajoutez 100 photos supplémentaires à votre quota actuel',
		popular: false,
		icon: '📸'
	},
	{
		id: 'addon-500', 
		name: 'Pack +500 Photos',
		photos: 500,
		price: 39.90,
		priceId: 'price_1S9K9SIgKYOzHnxE8IozRMRi', // À créer dans Stripe
		description: 'Ajoutez 500 photos supplémentaires à votre quota actuel',
		popular: true,
		icon: '🚀'
	},
	{
		id: 'addon-1000',
		name: 'Pack +1000 Photos', 
		photos: 1000,
		price: 79.90,
		priceId: 'price_1S9KAqIgKYOzHnxE9IA5m0fJ', // À créer dans Stripe
		description: 'Ajoutez 1000 photos supplémentaires à votre quota actuel',
		popular: false,
		icon: '💎'
	}
];

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
	const [showAddonPacks, setShowAddonPacks] = useState(false);
	const [successMessage, setSuccessMessage] = useState('');
	const [showTestSection, setShowTestSection] = useState(false);

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

	const handleAddonPurchase = async (pack) => {
		console.log('🛒 Tentative d\'achat pack:', pack);
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
						console.log('🔍 Session décodée pour addon:', decodedSession);
						adminUserId = decodedSession.userId || decodedSession.user_id || decodedSession.id;
					} catch (e) {
						console.log('Erreur décodage admin_session:', e);
					}
				}
			}

			if (!adminUserId) {
				throw new Error('Impossible de récupérer l\'ID administrateur. Veuillez vous reconnecter.');
			}

			console.log('🔑 Admin ID récupéré:', adminUserId);

			console.log('📤 Envoi requête API avec:', {
				priceId: pack.priceId,
				addonType: 'photo_pack',
				addonValue: pack.photos,
				addonName: pack.name,
				adminId: adminUserId
			});

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

			console.log('📥 Réponse API status:', res.status);

			const data = await res.json();
			console.log('📄 Données de réponse:', data);

			if (!res.ok) {
				throw new Error(data.error || 'Erreur lors de la création de la session Stripe');
			}

			console.log('🔄 Redirection vers Stripe avec sessionId:', data.sessionId);
			const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
			
			if (!stripe) {
				throw new Error('Stripe n\'a pas pu être chargé');
			}

			const result = await stripe.redirectToCheckout({ sessionId: data.sessionId });
			
			if (result.error) {
				throw new Error(result.error.message);
			}

		} catch (err) {
			console.error('❌ Erreur handleAddonPurchase:', err);
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	// Fonction de test pour ajouter du quota manuellement
	const handleTestQuota = async () => {
		// Debug: afficher tout le localStorage
		console.log('🔍 Contenu localStorage:', Object.keys(localStorage));

		// Essayer différentes clés possibles
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
					console.log('🔍 Session décodée:', decodedSession);
					adminUserId = decodedSession.userId || decodedSession.user_id || decodedSession.id;
				} catch (e) {
					console.log('Erreur décodage admin_session:', e);
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
					console.log('Erreur parsing adminData:', e);
				}
			}
		}

		console.log('🆔 Admin User ID trouvé:', adminUserId);

		// Si toujours pas trouvé, utiliser l'ID de la session décodée manuellement
		if (!adminUserId) {
			adminUserId = 'bb70d283-b02e-4e22-9d06-a705952b366b'; // ID from decoded admin_session
			console.log('🆔 Utilisation ID fixe:', adminUserId);
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

			{/* Section Packs Supplémentaires */}
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
