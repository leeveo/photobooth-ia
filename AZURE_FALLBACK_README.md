# Système de Fallback Azure AI

Ce document explique le système de fallback implémenté pour basculer automatiquement vers Azure AI lorsque Replicate ne répond pas dans les 5 secondes.

## Configuration

### Variables Azure AI
- **Clé API**: `84Lv7flCqhVehC79RpaLlZ18KpMd5I6HqDkKmJANsNPRDz3t8dAiJQQJ99BIAC5T7U2XJ3w3AAAAACOGsZ92`
- **Endpoint**: `https://photoboothia-resource.services.ai.azure.com/openai/deployments/FLUX.1-Kontext-pro/images/generations?api-version=2025-04-01-preview`
- **Modèle**: `FLUX.1-Kontext-pro`

## Comment ça fonctionne

1. **Requête principale (Replicate)**: Le système tente d'abord d'utiliser Replicate avec un timeout de 5 secondes
2. **Détection de timeout**: Si Replicate ne répond pas dans les 5 secondes, une exception de timeout est levée
3. **Fallback automatique**: Le système bascule automatiquement vers Azure AI
4. **Traçabilité**: La source de l'IA utilisée est enregistrée dans la base de données (colonne `ai_source`)

## Fichiers modifiés

### 1. API Azure AI
- **Fichier**: `/app/api/azure-ai/route.js`
- **Fonction**: Nouvelle route API pour interfacer avec Azure AI Foundry
- **Formats supportés**: Multiple formats de payload pour compatibilité

### 2. Page principale (photobooth-coiffure)
- **Fichier**: `/app/photobooth-coiffure/[slug]/cam/page.js.backup001`
- **Fonction**: `generateImageSwap()` modifiée avec système de fallback
- **Timeout**: Promise.race() avec timeout de 5 secondes

### 3. Base de données
- **Fichier**: `/supabase/migrations/add_ai_source_to_sessions.sql`
- **Table**: `sessions`
- **Nouvelle colonne**: `ai_source VARCHAR(50) DEFAULT 'replicate'`

### 4. Utilitaires de test
- **Fichier**: `/app/utils/test-ai-fallback.js`
- **Fonctions**: Tests unitaires pour chaque service IA

## Messages utilisateur

Le système affiche des messages informatifs à l'utilisateur :

```javascript
// Messages pour Replicate
setLogs(prevLogs => [...prevLogs, "Connexion au serveur IA principal..."]);
setLogs(prevLogs => [...prevLogs, "Image générée par Replicate!"]);

// Messages pour le fallback Azure
setLogs(prevLogs => [...prevLogs, "🔄 Basculement vers Azure AI..."]);
setLogs(prevLogs => [...prevLogs, "Image générée par Azure AI!"]);
```

## Test du système

### Via la console du navigateur
```javascript
// Test Replicate seul
await window.testAI.testReplicate();

// Test Azure seul
await window.testAI.testAzure();

// Test du système complet de fallback
await window.testAI.testFallbackSystem();
```

### Via les logs
Surveillez les logs de la console pour voir quel service a été utilisé :
- `[AI] ✅ Replicate successful` - Replicate a fonctionné
- `[AI] ❌ Replicate failed` - Replicate a échoué, fallback vers Azure
- `[AI] ✅ Azure AI successful` - Azure a pris le relais avec succès

## Structure de la réponse

### Replicate
```json
{
  "success": true,
  "output": "https://replicate.delivery/pbxt/...",
  "processingTime": 3500
}
```

### Azure AI
```json
{
  "success": true,
  "output": "https://storage.azure.com/...",
  "processingTime": 7200,
  "source": "azure"
}
```

## Gestion d'erreur

Si les deux services échouent :
```javascript
throw new Error(`Tous les services IA ont échoué. Replicate: ${replicateError.message}. Azure: ${azureError.message}`);
```

## Avantages

1. **Haute disponibilité**: Si un service est en panne, l'autre prend le relais
2. **Performance**: Timeout rapide (5s) pour éviter d'attendre trop longtemps
3. **Traçabilité**: Enregistrement de la source AI utilisée
4. **Transparence**: Messages utilisateur informatifs
5. **Compatibilité**: Même format de sortie pour les deux services

## Prochaines étapes

1. **Monitoring**: Ajouter des métriques pour suivre l'utilisation de chaque service
2. **Load balancing**: Répartir intelligemment la charge entre les services
3. **Configuration**: Rendre le timeout configurable via les paramètres du projet
4. **Autres services**: Ajouter d'autres fournisseurs IA pour encore plus de redondance
