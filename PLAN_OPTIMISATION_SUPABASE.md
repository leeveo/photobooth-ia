# PLAN D'OPTIMISATION SUPABASE POUR LA MOSAÏQUE

## 🎯 OBJECTIF
Résoudre les timeouts sur le projet `b492a7b4-de73-4401-aa53-d98be285d07b` qui a probablement >100k sessions.

## 🔍 DIAGNOSTIC DU PROBLÈME

### Erreurs observées:
- `code: '57014'` = Statement timeout
- `canceling statement due to statement timeout`
- Échec même avec limit=50

### Cause racine:
1. **Pas d'index optimisé** pour `(project_id, moderation, created_at)`
2. **Table massive** avec scan complet nécessaire
3. **Requête non optimisée** qui sélectionne des champs inutiles

## 🚀 SOLUTION EN 3 ÉTAPES

### ÉTAPE 1: Optimisation BDD (URGENT)
**À faire dans l'interface SQL Supabase:**

```sql
-- 1. Créer index composite optimal
CREATE INDEX idx_sessions_project_moderation_created 
ON sessions (project_id, moderation, created_at DESC);

-- 2. Index pour sessions avec images uniquement  
CREATE INDEX idx_sessions_with_images 
ON sessions (project_id, created_at DESC) 
WHERE result_s3_url IS NOT NULL;

-- 3. Analyser pour mettre à jour les statistiques
ANALYZE sessions;
```

### ÉTAPE 2: Optimisation requête application
**Changements dans le code:**

1. **Exclure les sessions sans images** dès la requête:
   ```javascript
   .not('result_s3_url', 'is', null)
   ```

2. **Réduire les champs sélectionnés**:
   ```javascript
   .select('id, result_s3_url, created_at')
   ```

3. **Limites progressives**:
   - Essai 1: 20 images (timeout 5s)
   - Essai 2: 10 images (timeout 3s)
   - Essai 3: 5 images (timeout 2s)

### ÉTAPE 3: Solution de pagination (si nécessaire)
**Si les index ne suffisent pas:**

- Implémenter une pagination par curseur
- Charger par blocs de 10-20 images
- Bouton "Charger plus" pour l'utilisateur

## 📊 RÉSULTATS ATTENDUS

### Avec les index:
- ✅ 50 images en 2-3 secondes
- ✅ Pas de timeout même pour projets volumineux
- ✅ Performance stable

### Sans index (fallback):
- ⚡ 10-20 images maximum 
- 🔄 Pagination nécessaire
- ⏰ Temps acceptable (2-5s)

## 🛠️ IMPLÉMENTATION IMMÉDIATE

### À faire MAINTENANT:
1. **Exécuter** `immediate_performance_fix.sql` dans Supabase
2. **Tester** la requête avec LIMIT 20
3. **Ajuster** les limites dans le code selon les résultats

### À faire APRÈS optimisation BDD:
1. **Remonter** progressivement les limites
2. **Tester** la stabilité
3. **Monitorer** les performances

## 💡 RECOMMANDATIONS LONG TERME

1. **Partitioning** par date si >1M sessions
2. **Cache Redis** pour les mosaïques fréquentes  
3. **Pré-calcul** des mosaïques en arrière-plan
4. **Compression** des métadonnées images

---

**PRIORITÉ 1**: Créer les index dans Supabase (5 minutes)
**PRIORITÉ 2**: Tester les nouvelles performances
**PRIORITÉ 3**: Ajuster les limites du code