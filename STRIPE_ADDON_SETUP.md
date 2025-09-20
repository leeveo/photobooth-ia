# Configuration des Produits Stripe pour les Packs Addon

## 📋 Produits à créer dans Stripe Dashboard

### 1. Pack +100 Photos
- **Type de produit** : One-time (Paiement unique)
- **Nom** : Pack +100 Photos Supplémentaires
- **Description** : Ajoutez 100 photos supplémentaires à votre quota mensuel PhotoboothIA
- **Prix** : 5,00 €
- **Devise** : EUR
- **Price ID à récupérer** : `price_addon_100_photos`

### 2. Pack +500 Photos  
- **Type de produit** : One-time (Paiement unique)
- **Nom** : Pack +500 Photos Supplémentaires
- **Description** : Ajoutez 500 photos supplémentaires à votre quota mensuel PhotoboothIA
- **Prix** : 20,00 €
- **Devise** : EUR
- **Price ID à récupérer** : `price_addon_500_photos`

### 3. Pack +1000 Photos
- **Type de produit** : One-time (Paiement unique)
- **Nom** : Pack +1000 Photos Supplémentaires
- **Description** : Ajoutez 1000 photos supplémentaires à votre quota mensuel PhotoboothIA
- **Prix** : 35,00 €
- **Devise** : EUR
- **Price ID à récupérer** : `price_addon_1000_photos`

## 🔧 Étapes dans Stripe Dashboard

### Étape 1 : Aller dans Products
1. Connectez-vous à votre Stripe Dashboard
2. Allez dans **Products** > **Product catalog**
3. Cliquez sur **+ Add product**

### Étape 2 : Créer chaque produit
Pour chaque pack :

1. **Product information**
   - Name : [Nom du pack]
   - Description : [Description du pack]
   - Images : Optionnel (vous pouvez ajouter une image 📸)

2. **Pricing model**
   - Choisir **One-time** (pas recurring)
   - Price : [Prix du pack]
   - Currency : EUR

3. **Advanced options**
   - Laisser les paramètres par défaut
   - Optionnel : Ajouter des metadata si nécessaire

4. **Save product**

### Étape 3 : Récupérer les Price IDs
1. Une fois les produits créés, cliquez sur chaque produit
2. Dans la section **Pricing**, vous verrez le **Price ID**
3. Copiez chaque Price ID et remplacez dans le code :

```javascript
// Dans app/photobooth-ia/admin/choose-plan/page.js
const ADDON_PACKS = [
	{
		id: 'addon-100',
		priceId: 'price_1234567890abcdef', // ← Remplacer par le vrai Price ID
		// ...
	},
	{
		id: 'addon-500', 
		priceId: 'price_0987654321fedcba', // ← Remplacer par le vrai Price ID
		// ...
	},
	{
		id: 'addon-1000',
		priceId: 'price_abcdef1234567890', // ← Remplacer par le vrai Price ID
		// ...
	}
];
```

## 🧪 Test en mode développement

1. **Activez le mode test** dans Stripe Dashboard
2. Créez les produits en mode test d'abord
3. Utilisez les Price IDs de test pour vos tests
4. Testez l'achat avec les cartes de test Stripe :
   - `4242 4242 4242 4242` (Visa réussie)
   - `4000 0000 0000 0002` (Carte refusée)

## 🚀 Déploiement en production

1. Basculez en mode **Live** dans Stripe Dashboard
2. Re-créez les mêmes produits en mode live
3. Mettez à jour les Price IDs dans votre code avec les IDs de production
4. Testez l'achat avec une vraie carte (montant faible)

## 🔐 Variables d'environnement nécessaires

Assurez-vous d'avoir ces variables dans votre `.env.local` :

```env
STRIPE_SECRET_KEY=sk_live_... (ou sk_test_... pour les tests)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... (ou pk_test_... pour les tests)
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_BASE_URL=https://votre-domaine.com
```

## ⚠️ Points importants

1. **Webhook** : Assurez-vous que votre webhook Stripe pointe vers `/api/stripe-webhook`
2. **Événements webhook** : Activez `checkout.session.completed`
3. **Métadonnées** : Les métadonnées dans la session permettent de distinguer les addons des abonnements
4. **Base de données** : Exécutez le script SQL `create_addon_purchases_table.sql` avant de tester

## 🧑‍💻 Commandes utiles pour tester

```bash
# Voir les logs du webhook en temps réel
stripe listen --forward-to localhost:3000/api/stripe-webhook

# Déclencher un événement de test
stripe trigger checkout.session.completed
```