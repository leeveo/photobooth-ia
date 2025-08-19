# Système de Swipe et Notation des Photos 📱❤️

## Aperçu

Un système de notation des photos inspiré de Tinder qui permet aux utilisateurs d'évaluer les photos de l'événement en swipant à droite (j'aime) ou à gauche (passer).

## 🚀 Nouvelles Fonctionnalités

### 1. **Page Swipe** (`/photobooth-coiffure/[slug]/swipe`)
- Interface type Tinder avec cartes swipables
- Swipe à droite = ❤️ (score: 1)
- Swipe à gauche = ❌ (score: 0)
- Compteurs en temps réel
- Animation fluide avec framer-motion
- Compatible mobile et desktop

### 2. **Page Résultats** (`/photobooth-coiffure/[slug]/results`)
- Statistiques complètes des votes
- Photos les plus aimées en première position
- Taux d'approbation global
- Séparation visuelle entre photos aimées/passées

### 3. **API de Gestion des Scores** (`/api/update-image-score`)
- Endpoint sécurisé pour mettre à jour les scores
- Support GET pour récupérer les statistiques
- Validation des données d'entrée
- Logging des actions

## 🗄️ Structure de Base de Données

### Migration SQL (`_migrations/add_score_system.sql`)
```sql
-- Ajouter la colonne score aux tables
ALTER TABLE sessions ADD COLUMN score INTEGER DEFAULT 0;
ALTER TABLE project_images ADD COLUMN score INTEGER DEFAULT 0;

-- Ajouter des index pour les performances
CREATE INDEX sessions_score_idx ON sessions(score DESC, created_at DESC);
CREATE INDEX project_images_score_idx ON project_images(score DESC, created_at DESC);
```

### Champs ajoutés :
- `score` : INTEGER (0 pour "passé", 1 pour "aimé")
- Index sur `(score DESC, created_at DESC)` pour tri optimisé

## 📱 Interface Utilisateur

### Page Swipe
- **Cartes swipables** : Interface tactile intuitive
- **Indicateurs visuels** : Compteurs de likes/passes en temps réel
- **Boutons d'action** : Alternative au swipe tactile
- **Progression** : Affichage du nombre de photos restantes
- **Écran de fin** : Récapitulatif des votes avec option de recommencer

### Page Résultats
- **Statistiques globales** : Total, likes, passes, taux d'approbation
- **Galerie des favorites** : Photos avec score = 1
- **Galerie des passées** : Photos avec score = 0 (opacity réduite)
- **Navigation** : Liens vers swipe et galerie classique

## 🔗 Navigation

### Liens ajoutés :
1. **Page d'affichage d'image** (`/image`) :
   - "🖼️ Voir toutes les photos de l'événement" → Galerie classique
   - "❤️ Évaluer les photos (Swipe)" → Page swipe

2. **Page résultats** :
   - "🔄 Continuer à évaluer" → Page swipe
   - "🖼️ Voir la galerie classique" → Galerie mosaïque

## 🛠️ Installation et Configuration

### 1. Installer les dépendances
```bash
npm install react-tinder-card
```

### 2. Exécuter la migration SQL
Appliquez le fichier `_migrations/add_score_system.sql` sur votre base de données Supabase.

### 3. Configuration
Aucune configuration supplémentaire requise. Le système utilise les paramètres existants de `mosaic_settings`.

## 🎯 Utilisation

### Pour les Utilisateurs
1. **Scanner le QR code** ou cliquer sur "Voir ma photo"
2. **Cliquer sur "❤️ Évaluer les photos (Swipe)"**
3. **Swiper** ou utiliser les boutons :
   - Droite/❤️ : J'aime cette photo
   - Gauche/❌ : Passer cette photo
4. **Voir les résultats** : Statistiques et classement des photos

### Pour les Administrateurs
- **Accès aux statistiques** via `/photobooth-coiffure/[slug]/results`
- **API de stats** : `GET /api/update-image-score?projectId=xxx`
- **Monitoring** : Logs dans la console pour chaque vote

## 📊 Exemple de Statistiques

```json
{
  "totalScores": 50,
  "likes": 35,
  "passes": 15,
  "likeRatio": 70.0
}
```

## 🔧 Développement

### Structure des fichiers
```
app/photobooth-coiffure/[slug]/
├── swipe/page.js          # Interface de swipe
├── results/page.js        # Page des résultats
└── image/page.js          # Page modifiée avec nouveaux liens

app/api/
└── update-image-score/route.js  # API de gestion des scores

_migrations/
└── add_score_system.sql   # Migration de base de données
```

### Technologies utilisées
- **react-tinder-card** : Composant de swipe
- **framer-motion** : Animations
- **Supabase** : Base de données et API
- **Next.js 13+** : App Router

## 🚀 Évolutions possibles

1. **Système de notation étendu** : Échelle 1-5 étoiles
2. **Commentaires** : Possibilité d'ajouter des commentaires
3. **Modération** : Interface admin pour gérer les contenus
4. **Analytics** : Graphiques de progression dans le temps
5. **Notifications** : Alertes pour les photos populaires
6. **Export** : Export des statistiques en CSV/PDF

## 🐛 Dépannage

### Problèmes courants :
1. **Erreur de migration** : Vérifier que les colonnes n'existent pas déjà
2. **Swipe ne fonctionne pas** : Vérifier que react-tinder-card est installé
3. **Scores non sauvegardés** : Vérifier les logs de l'API dans la console

### Logs utiles :
- Console navigateur : Actions de swipe et erreurs
- API logs : Succès/échecs de mise à jour des scores
- Supabase logs : Requêtes de base de données
