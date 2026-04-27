# DIAGNOSTIC - Incohérence Dashboard vs Base de Données

## Utilisateur concerné
**ID**: bb70d283-b02e-4e22-9d06-a705952b366b

## Symptômes
- **Dashboard affiche**:
  - Période: -391
  - Quota disponible: 203 photos
  - Total photos générées: 594

- **Base de données**:
  - Crédits restants: 5016

## Cause du problème

Il y avait une **incohérence dans le calcul de la date de référence** entre :

1. **Le Dashboard** (page.tsx) utilisait: `created_at` du paiement
   - Comptait TOUTES les photos depuis la création du paiement
   - Si paiement créé il y a 6 mois → compte 6 mois de photos

2. **Le Quota Manager** (route.js) utilisait: `photo_quota_reset_at`
   - Comptait seulement depuis le dernier reset mensuel
   - Cohérent avec le système de quota mensuel

## Exemple concret

Si un utilisateur a :
- Paiement créé le 1er octobre 2025 (`created_at`)
- Dernier reset le 1er avril 2026 (`photo_quota_reset_at`)
- 200 photos de quota mensuel
- 5000 photos d'addons

**AVANT le correctif :**
- Dashboard comptait depuis le 1er octobre → 594 photos consommées
- Quota Manager comptait depuis le 1er avril → peut-être 100 photos consommées
- Résultat : Dashboard montre "épuisé", mais l'utilisateur a encore 5000+ crédits

**APRÈS le correctif :**
- Dashboard et Quota Manager utilisent tous deux `photo_quota_reset_at`
- Comptage cohérent entre les deux systèmes

## Correctif appliqué

**Fichier modifié**: `app/photobooth-ia/admin/dashboard/page.tsx`

**Ligne 408** - Changement:
```typescript
// AVANT (INCORRECT)
resetAt = paymentResult.data.created_at || resetAt;

// APRÈS (CORRECT)
resetAt = paymentResult.data.photo_quota_reset_at || paymentResult.data.created_at || resetAt;
```

## Comment vérifier

### 1. Exécuter le diagnostic SQL

Exécutez le fichier : `sql/diagnostic-complet-bb70d283.sql`

Ce fichier va vous montrer :
- ✅ Les paiements actifs
- ✅ Le calcul selon Dashboard (AVANT le fix)
- ✅ Le calcul selon Quota-Manager
- ✅ La différence entre les deux méthodes
- ✅ Les addons de l'utilisateur
- ✅ La consommation par jour

### 2. Vérifier les dates clés

```sql
SELECT 
  created_at as date_creation_paiement,
  photo_quota_reset_at as date_debut_periode_actuelle,
  quota_expires_at as date_expiration,
  photo_quota as quota_mensuel
FROM admin_payments 
WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'
  AND status = 'succeeded'
  AND stripe_subscription_status IN ('active', 'trialing')
ORDER BY created_at DESC
LIMIT 1;
```

### 3. Comparer les comptages

```sql
-- Photos depuis created_at (méthode INCORRECTE du dashboard)
SELECT COUNT(*) as photos_depuis_created_at
FROM quota_usage
WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'
  AND consumed_at >= (
    SELECT created_at FROM admin_payments 
    WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'
      AND status = 'succeeded'
    ORDER BY created_at DESC LIMIT 1
  );

-- Photos depuis reset_at (méthode CORRECTE)
SELECT COUNT(*) as photos_depuis_reset_at
FROM quota_usage
WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'
  AND consumed_at >= (
    SELECT photo_quota_reset_at FROM admin_payments 
    WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'
      AND status = 'succeeded'
    ORDER BY created_at DESC LIMIT 1
  );
```

### 4. Tester le dashboard après déploiement

1. Déployez le correctif
2. Rafraîchissez le dashboard
3. Vérifiez que les valeurs sont maintenant cohérentes entre:
   - Le dashboard
   - La requête SQL
   - Le quota manager

## Valeurs attendues après correctif

Après le correctif, vous devriez voir :
- **Quota total** = quota_mensuel + total_addons
- **Photos utilisées** = COUNT depuis `photo_quota_reset_at`
- **Crédits restants** = quota_total - photos_utilisées
- **Cohérence** entre Dashboard et BDD

## Impact sur les autres utilisateurs

Ce bug affectait TOUS les utilisateurs qui ont :
- Un paiement actif
- Une différence entre `created_at` et `photo_quota_reset_at`
- Typiquement les utilisateurs avec abonnements mensuels renouvelés

Le correctif résout le problème pour tous les utilisateurs simultanément.

## Actions recommandées

1. ✅ **Exécuter le diagnostic SQL** pour l'utilisateur bb70d283-b02e-4e22-9d06-a705952b366b
2. ✅ **Déployer le correctif** du dashboard
3. ✅ **Vérifier** que les valeurs sont cohérentes après déploiement
4. ⚠️ **Surveiller** les autres utilisateurs pour s'assurer qu'ils voient des valeurs correctes
5. 📊 **Documenter** les valeurs réelles trouvées dans le diagnostic

## Questions à vérifier

1. Pourquoi cet utilisateur a-t-il 5016 crédits restants ? A-t-il acheté beaucoup d'addons ?
2. La date `photo_quota_reset_at` est-elle correctement mise à jour lors des renouvellements ?
3. Y a-t-il d'autres utilisateurs avec des incohérences similaires ?
