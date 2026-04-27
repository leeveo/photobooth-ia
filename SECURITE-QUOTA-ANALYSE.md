# SÉCURITÉ DU SYSTÈME DE QUOTA - ANALYSE COMPLÈTE

## ✅ Réponse à vos questions

### 1. Est-ce qu'un utilisateur peut dépasser son quota ?

**NON** ❌ - Le système a plusieurs protections :

#### Protection #1 : Validation du quota avant génération
```javascript
// Dans quota-manager/route.js ligne 192
canTakePhoto: remaining > 0
```
Si `remaining <= 0` → **Génération bloquée**

#### Protection #2 : Vérification dans consumeQuota
```javascript
// Dans quota-manager/route.js ligne 218
if (!quotaStatus.canTakePhoto) {
  return NextResponse.json({ 
    error: 'Quota épuisé',
    quotaStatus 
  }, { status: 403 });
}
```
Retourne une erreur HTTP 403 (Forbidden) si quota épuisé

#### Protection #3 : Validation stricte des abonnements
```javascript
// Lignes 94-102
if (paymentData.status === 'succeeded' && 
    ['active', 'trialing'].includes(paymentData.stripe_subscription_status) &&
    !isQuotaExpired) {
  // ✅ Quota accordé
} else {
  monthlyQuota = 3; // ❌ Retour au plan gratuit
}
```

### 2. D'où venait le solde négatif (-391) ?

Le **solde négatif était un BUG D'AFFICHAGE** dans le dashboard, PAS un vrai dépassement !

**AVANT le correctif** :
- Dashboard comptait depuis `created_at` du paiement (ex: il y a 6 mois)
- Total consommé affiché : 594 photos (sur 6 mois)
- Quota mensuel : 200 photos
- Calcul dashboard : 200 - 594 = **-394** ❌ FAUX

**En réalité** :
- Quota manager comptait depuis `photo_quota_reset_at` (ex: il y a 1 mois)
- Total consommé réel : peut-être 50 photos (sur 1 mois)
- Crédits restants réels : 5016 (avec addons)
- L'utilisateur n'a JAMAIS pu dépasser son quota

**APRÈS le correctif** :
- Dashboard et quota manager utilisent la même date de référence
- Plus de solde négatif affiché
- Affichage cohérent avec la réalité

### 3. Le reset mensuel fonctionne-t-il ?

**OUI** ✅ - Le reset se fait automatiquement via la date `photo_quota_reset_at`

#### Comment ça marche :

```javascript
// quota-manager compte seulement depuis cette date
.gte('consumed_at', quotaResetAt)
```

**Exemple** :
- 1er janvier : Abonnement créé, `photo_quota_reset_at` = 1er janvier
- 31 janvier : 200 photos consommées sur 200 → quota épuisé
- 1er février : Stripe webhook met à jour `photo_quota_reset_at` = 1er février
- 1er février : Le compteur redémarre à 0 automatiquement car on compte depuis le 1er février
- Résultat : **200 photos disponibles à nouveau** ✅

### 4. Si l'utilisateur ne paie pas, perd-il son quota ?

**OUI** ✅ - Protection stricte en place

#### Scénario 1 : Abonnement annulé/expiré
```javascript
// Si stripe_subscription_status != 'active' ou 'trialing'
monthlyQuota = 3; // Retour immédiat au plan gratuit
```

#### Scénario 2 : Paiement échoué
```javascript
// Si status != 'succeeded'
monthlyQuota = 3; // Plan gratuit
```

#### Scénario 3 : Date expirée
```javascript
// Si quota_expires_at < maintenant
monthlyQuota = 3; // Plan gratuit
```

**Dans tous les cas** → L'utilisateur retourne au **plan gratuit (3 photos)**

## 🔒 Niveaux de protection

### Niveau 1 : Validation de l'abonnement
- ✅ Statut paiement vérifié
- ✅ Statut abonnement Stripe vérifié
- ✅ Date d'expiration vérifiée

### Niveau 2 : Calcul du quota
- ✅ Quota mensuel uniquement si abonnement valide
- ✅ Sinon retour au plan gratuit (3 photos)
- ✅ Addons comptés séparément

### Niveau 3 : Vérification avant génération
- ✅ `canTakePhoto` calculé : `remaining > 0`
- ✅ Erreur 403 si quota épuisé
- ✅ Impossible de générer si `remaining <= 0`

### Niveau 4 : Enregistrement de la consommation
- ✅ Chaque génération insérée dans `quota_usage`
- ✅ Compteur incrémenté en temps réel
- ✅ Traçabilité complète

## ⚠️ Point d'attention : Expiration en cours de mois

**Scenario à surveiller** :
1. Utilisateur a 200 photos de quota
2. Il en consomme 50
3. Son abonnement expire (paiement échoué)
4. Il retourne au plan gratuit (3 photos)
5. A-t-il encore ses 3 photos gratuites ou sont-elles "consommées" ?

**Vérification nécessaire** :

```sql
-- Que se passe-t-il si un utilisateur qui a consommé 50 photos
-- retourne au plan gratuit de 3 photos ?

-- CAS 1 : Comptage continue depuis photo_quota_reset_at
-- → Il a consommé 50 photos, quota gratuit = 3
-- → remaining = 3 - 50 = -47 → Bloqué ❌

-- CAS 2 : Reset du compteur quand on passe au plan gratuit
-- → Nouveau comptage depuis admin_users.created_at
-- → remaining = 3 - 0 = 3 → OK ✅
```

**Solution actuelle** (ligne 123) :
```javascript
// Pour les utilisateurs déchus, utiliser la date de création
quotaResetAt = adminData?.created_at || new Date().toISOString();
```

Cette ligne utilise `created_at` de l'admin, ce qui signifie qu'il compte TOUTES les photos depuis l'inscription.

### ⚠️ PROBLÈME POTENTIEL

Si un utilisateur :
1. S'est inscrit il y a 1 an
2. A généré 1000 photos dans le passé (avec abonnement)
3. Son abonnement expire aujourd'hui
4. Il retourne au plan gratuit (3 photos)

**Calcul actuel** :
```javascript
quotaResetAt = adminData.created_at; // Il y a 1 an
monthlyConsumed = 1000; // Photos depuis 1 an
remaining = 3 - 1000 = -997; // ❌ BLOQUÉ
```

→ **Il ne peut plus prendre de photos gratuites !**

## 🔧 Correctif recommandé

Pour éviter ce problème, il faut **réinitialiser la date de référence** quand un utilisateur passe au plan gratuit :

```javascript
// Dans checkQuotaStatus, ligne 105
} else {
  console.log(`[QUOTA_MANAGER] Plan invalidé - Status: ${paymentData.status}, Subscription: ${paymentData.stripe_subscription_status}, Expired: ${isQuotaExpired}`);
  monthlyQuota = 3; // Retour au plan gratuit
  isFreePlan = true;
  
  // 🔧 FIX : Utiliser la date d'expiration comme nouveau départ
  // au lieu de created_at qui compte TOUTES les photos depuis l'inscription
  quotaResetAt = new Date().toISOString(); // ✅ NOUVEAU DÉPART
}
```

**Avantage** :
- ✅ Utilisateur qui perd son abonnement peut quand même utiliser ses 3 photos gratuites
- ✅ Compteur repart de zéro à partir de la date d'expiration
- ✅ Plus juste pour l'utilisateur

**Inconvénient** :
- ⚠️ Un utilisateur pourrait abuser : payer 1 mois, annuler, avoir 3 photos, répéter

**Solution équilibrée** :
```javascript
// Réinitialiser au maximum une fois par mois
const oneMonthAgo = new Date();
oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

quotaResetAt = Math.max(
  adminData?.created_at,
  oneMonthAgo.toISOString()
);
```

## 📋 Résumé des protections actuelles

| Protection | Status | Détails |
|------------|--------|---------|
| ✅ Validation abonnement | **OK** | Status, subscription_status, expiration vérifiés |
| ✅ Bloquage si quota épuisé | **OK** | `canTakePhoto: remaining > 0` |
| ✅ Erreur 403 en cas de dépassement | **OK** | `consumeQuota` bloque si `!canTakePhoto` |
| ✅ Reset mensuel automatique | **OK** | Via `photo_quota_reset_at` |
| ✅ Retour au plan gratuit si impayé | **OK** | Quota = 3 photos si abonnement invalide |
| ⚠️ Plan gratuit après expiration | **À AMÉLIORER** | Risque de blocage si beaucoup de photos consommées dans le passé |
| ✅ Affichage dashboard | **CORRIGÉ** | Plus de solde négatif affiché |

## ✅ Conclusion

**À vos questions** :

1. **Un utilisateur peut-il faire plus de photos que son crédit mensuel ?**
   - ❌ **NON** - Bloqué par `canTakePhoto` et erreur 403

2. **Pourquoi aviez-vous un solde négatif ?**
   - 🐛 **Bug d'affichage** du dashboard (corrigé)
   - L'utilisateur n'a jamais pu réellement dépasser

3. **Le reset mensuel fonctionne-t-il ?**
   - ✅ **OUI** - Automatique via `photo_quota_reset_at`

4. **Si l'utilisateur ne paie pas, perd-il son quota ?**
   - ✅ **OUI** - Retour immédiat au plan gratuit (3 photos)
   - ⚠️ **MAIS** risque de blocage total s'il a beaucoup consommé dans le passé

**Recommandation** : Appliquer le correctif pour le plan gratuit post-expiration (voir section "Correctif recommandé").
