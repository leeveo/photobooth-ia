# CORRECTIFS APPLIQUÉS AU SYSTÈME DE QUOTA

## 📋 Résumé des changements

Trois correctifs critiques ont été appliqués pour résoudre les problèmes de quota :

### 1️⃣ Correctif Dashboard - Incohérence d'affichage ✅

**Problème** : Le dashboard affichait un solde négatif (-391) alors que l'utilisateur avait 5016 crédits en réalité.

**Cause** : Le dashboard comptait depuis `created_at` (date de création du paiement) au lieu de `photo_quota_reset_at` (date du dernier reset).

**Fichier modifié** : `app/photobooth-ia/admin/dashboard/page.tsx`

**Changement** :
```typescript
// AVANT (INCORRECT)
resetAt = paymentResult.data.created_at || resetAt;

// APRÈS (CORRECT)
resetAt = paymentResult.data.photo_quota_reset_at || paymentResult.data.created_at || resetAt;
```

**Résultat** : Dashboard et quota-manager utilisent maintenant la même date de référence → Plus d'incohérence

---

### 2️⃣ Correctif Plan Gratuit Après Expiration ✅

**Problème** : Un utilisateur qui perd son abonnement était bloqué et ne pouvait plus utiliser ses 3 photos gratuites.

**Cause** : Le système comptait TOUTES les photos depuis l'inscription (`created_at`), pas seulement depuis le début du mois.

**Exemple** :
- Utilisateur inscrit il y a 1 an
- A consommé 1000 photos avec son abonnement
- Son abonnement expire aujourd'hui
- Calcul : `3 (gratuit) - 1000 (consommées) = -997` → **Bloqué** ❌

**Fichier modifié** : `app/api/quota-manager/route.js`

**Changement** :
```javascript
// AVANT (INCORRECT) - lignes 105-113
} else {
  monthlyQuota = 3;
  isFreePlan = true;
  
  const { data: adminData } = await supabase
    .from('admin_users')
    .select('created_at')
    .eq('id', adminId)
    .single();
  quotaResetAt = adminData?.created_at || new Date().toISOString();
}

// APRÈS (CORRECT)
} else {
  monthlyQuota = 3;
  isFreePlan = true;
  
  // Réinitialiser le compteur au début du mois ou à l'expiration
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  if (paymentData && paymentData.quota_expires_at) {
    const expirationDate = new Date(paymentData.quota_expires_at);
    quotaResetAt = expirationDate > startOfMonth 
      ? expirationDate.toISOString() 
      : startOfMonth.toISOString();
  } else {
    quotaResetAt = startOfMonth.toISOString();
  }
}
```

**Résultat** : 
- Utilisateur qui perd son abonnement → Compteur repart à zéro depuis l'expiration
- Peut utiliser ses 3 photos gratuites mensuelles ✅
- Reset mensuel automatique des 3 photos gratuites ✅

---

### 3️⃣ Correctif Reset Mensuel Utilisateurs Gratuits ✅

**Problème** : Les utilisateurs gratuits ne bénéficiaient pas d'un reset mensuel de leurs 3 photos.

**Cause** : Le compteur partait de `created_at` (inscription) et comptait TOUTES les photos jamais prises.

**Fichier modifié** : 
- `app/api/quota-manager/route.js`
- `app/photobooth-ia/admin/dashboard/page.tsx`

**Changement quota-manager** :
```javascript
// AVANT (INCORRECT) - lignes 118-126
} else {
  const { data: adminData } = await supabase
    .from('admin_users')
    .select('created_at')
    .eq('id', adminId)
    .single();
  quotaResetAt = adminData?.created_at || new Date().toISOString();
}

// APRÈS (CORRECT)
} else {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  quotaResetAt = startOfMonth.toISOString();
}
```

**Changement dashboard** :
```typescript
// AVANT (INCORRECT)
let resetAt = adminResult.data?.created_at || new Date().toISOString();

// APRÈS (CORRECT)
const now = new Date();
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
let resetAt = startOfMonth.toISOString();
```

**Résultat** : 
- Utilisateurs gratuits ont 3 photos PAR MOIS ✅
- Reset automatique le 1er de chaque mois ✅
- Plus de blocage après avoir consommé les 3 photos du mois dernier ✅

---

## 🎯 Impact des correctifs

### Avant les correctifs ❌

| Scénario | Comportement |
|----------|--------------|
| Dashboard vs BDD | Incohérence, solde négatif affiché |
| Utilisateur perd abonnement | Bloqué définitivement, ne peut plus utiliser le plan gratuit |
| Utilisateur gratuit | 3 photos À VIE (pas de reset mensuel) |

### Après les correctifs ✅

| Scénario | Comportement |
|----------|--------------|
| Dashboard vs BDD | ✅ Cohérent, même calcul partout |
| Utilisateur perd abonnement | ✅ Retourne au plan gratuit (3 photos/mois) |
| Utilisateur gratuit | ✅ 3 photos PAR MOIS avec reset automatique |

---

## 📊 Logique du système de quota (après correctifs)

### Pour les utilisateurs PAYANTS

```
1. Vérification abonnement :
   ✓ status = 'succeeded'
   ✓ stripe_subscription_status IN ('active', 'trialing')
   ✓ quota_expires_at >= maintenant

2. Si valide :
   → monthlyQuota = photo_quota (200, 1000, 5000, etc.)
   → resetAt = photo_quota_reset_at
   → Reset automatique chaque mois

3. Si invalide :
   → Passe au scénario "Utilisateurs GRATUITS"
```

### Pour les utilisateurs GRATUITS (ou expirés)

```
1. monthlyQuota = 3 photos

2. resetAt = Début du mois en cours OU date d'expiration
   → Compteur repart à zéro chaque 1er du mois
   → OU repart à zéro à l'expiration de l'abonnement

3. Reset mensuel automatique des 3 photos
```

### Calcul du quota restant

```javascript
quotaRestant = (monthlyQuota + addons) - photosConsomméesDepuisResetAt
```

- Si `quotaRestant > 0` → ✅ Génération autorisée
- Si `quotaRestant <= 0` → ❌ Erreur 403 "Quota épuisé"

---

## 🔍 Tests recommandés

### Test 1 : Utilisateur gratuit - Reset mensuel
1. Créer un compte sans paiement
2. Générer 3 photos → Devrait bloquer à la 4ème
3. Changer manuellement la date serveur au mois suivant
4. Vérifier que 3 nouvelles photos sont disponibles ✅

### Test 2 : Utilisateur qui perd son abonnement
1. Créer un compte avec abonnement (200 photos/mois)
2. Consommer 50 photos
3. Annuler l'abonnement (via Stripe webhook)
4. Vérifier que l'utilisateur a bien 3 photos gratuites disponibles ✅
5. Le mois suivant, vérifier qu'il a à nouveau 3 photos ✅

### Test 3 : Dashboard cohérent avec quota-manager
1. Créer un compte avec abonnement
2. Générer quelques photos
3. Comparer :
   - Dashboard : Quota affiché
   - SQL : `SELECT COUNT(*) FROM quota_usage WHERE ...`
   - API quota-manager : `/api/quota-manager` (action: check)
4. Les 3 sources doivent afficher le MÊME résultat ✅

---

## 📝 Notes importantes

### Reset mensuel

Le reset se fait automatiquement via la **date de référence** :

- **Utilisateurs payants** : `photo_quota_reset_at` (mis à jour par Stripe webhook)
- **Utilisateurs gratuits** : `startOfMonth` (1er du mois en cours)

Pas besoin de script cron ou de job planifié, c'est **dynamique** lors du calcul.

### Sécurité

Les 3 niveaux de protection restent actifs :

1. ✅ Validation stricte de l'abonnement
2. ✅ Vérification `canTakePhoto` avant chaque génération
3. ✅ Erreur 403 si quota épuisé

**Impossible de dépasser le quota**, même avec les correctifs.

### Migration

Aucune migration de données nécessaire. Les correctifs sont **rétro-compatibles** :

- Les anciens utilisateurs bénéficient automatiquement du reset mensuel
- Les quotas existants restent valides
- Le comptage se fait dynamiquement lors de chaque appel

---

## 🚀 Prochaines étapes

1. ✅ Déployer les correctifs
2. ✅ Tester avec l'utilisateur `bb70d283-b02e-4e22-9d06-a705952b366b`
3. ✅ Vérifier que le dashboard affiche maintenant la bonne valeur
4. 📊 Surveiller les logs pour détecter d'éventuels problèmes
5. 📧 Informer les utilisateurs du reset mensuel des 3 photos gratuites

---

## 📁 Fichiers modifiés

1. `app/api/quota-manager/route.js` - Logique de quota backend
2. `app/photobooth-ia/admin/dashboard/page.tsx` - Affichage dashboard
3. `sql/diagnostic-complet-bb70d283.sql` - Diagnostic utilisateur
4. `sql/verif-rapide-bb70d283.sql` - Vérification rapide
5. `DIAGNOSTIC-QUOTA-INCOHERENCE.md` - Documentation du problème
6. `SECURITE-QUOTA-ANALYSE.md` - Analyse de sécurité complète
7. `CORRECTIFS-QUOTA-RESUME.md` - Ce document

---

**Date des correctifs** : 27 avril 2026  
**Version** : 1.0.0
