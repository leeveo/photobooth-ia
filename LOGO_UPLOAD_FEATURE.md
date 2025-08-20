# Fonctionnalité d'Upload de Logo

## 📋 Résumé des modifications

Cette fonctionnalité permet aux utilisateurs d'uploader et de gérer les logos de leurs projets depuis la page d'édition des projets.

## ✅ Fonctionnalités implémentées

### 1. **Affichage du logo existant**
- ✅ Le logo actuel est affiché dans la section "Informations" du projet
- ✅ Le logo apparaît également dans le header de la page de détail du projet  
- ✅ Le logo est affiché dans la liste des projets
- ✅ Si aucun logo n'existe, un placeholder est affiché

### 2. **Upload de nouveau logo**
- ✅ Interface pour sélectionner un nouveau fichier image
- ✅ Prévisualisation du nouveau logo avant sauvegarde
- ✅ Upload vers AWS S3 avec le même système que la page de création
- ✅ Support des formats PNG, JPG, GIF (jusqu'à 10MB)
- ✅ Génération automatique d'un nom de fichier unique

### 3. **Gestion du logo**
- ✅ Bouton "Changer" pour modifier le logo existant
- ✅ Bouton "Supprimer" pour enlever le logo
- ✅ Sauvegarde du logo avec les autres informations du projet

### 4. **Interface utilisateur**
- ✅ Section dédiée au logo dans le formulaire d'informations
- ✅ Indicateurs visuels pendant l'upload (loading states)
- ✅ Messages de confirmation pour l'upload dans le popup de sauvegarde
- ✅ Interface responsive et intuitive

## 🔧 Fichiers modifiés

### `app/photobooth-ia/admin/projects/components/ProjectInfoForm.js`
- Ajout des états pour la gestion du logo (`logoFile`, `logoPreview`, `uploadingLogo`)
- Ajout des fonctions `handleLogoChange()` et `handleRemoveLogo()`
- Modification de `handleSaveConfirmed()` pour gérer l'upload S3
- Ajout de la section UI pour l'upload du logo
- Mise à jour des états de loading et des messages de confirmation

## 📊 Structure de la base de données

La colonne `logo_url` existe déjà dans la table `projects` :
```sql
logo_url text null
```

## 🔄 Flux de fonctionnement

1. **Affichage initial** : Le composant vérifie si `project.logo_url` existe
2. **Sélection de fichier** : L'utilisateur clique sur "Ajouter un logo" ou "Changer"
3. **Prévisualisation** : Le fichier sélectionné est affiché en prévisualisation
4. **Sauvegarde** : Lors du clic sur "Enregistrer les modifications" :
   - Si un nouveau logo est sélectionné, il est uploadé vers S3
   - L'URL retournée par S3 est sauvegardée dans `project.logo_url`
   - Les autres modifications du projet sont également sauvegardées

## 🛠 API utilisée

### Endpoint S3 : `/api/upload-s3`
- **Méthode** : POST
- **Paramètres** :
  - `file` : Fichier image à uploader
  - `bucket` : "leeveostockage" 
  - `path` : `photobooth_uploads/logos/{timestamp}-{projectId}-{filename}`
- **Retour** : `{ success: true, url: "https://..." }`

## 🎯 Cohérence avec l'existant

Cette implémentation réutilise exactement :
- ✅ Le même système d'upload S3 que la page de création
- ✅ Le même bucket et structure de dossiers
- ✅ La même logique de nommage des fichiers
- ✅ Les mêmes composants UI et styles

## ✨ Bonus

- Interface drag & drop ready (structure préparée)
- Validation automatique du type de fichier
- Gestion des erreurs d'upload
- États de loading cohérents avec le reste de l'application
- Design cohérent avec l'interface existante
