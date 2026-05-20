# 🎨 WORKFLOW PHOTOBOOTH IA - DOCUMENTATION COMPLÈTE

## 📋 Table des matières
1. [Vue d'ensemble](#vue-densemble)
2. [Architecture technique](#architecture-technique)
3. [Modèles IA utilisés](#modèles-ia-utilisés)
4. [Workflow complet](#workflow-complet)
5. [Structure des prompts](#structure-des-prompts)
6. [Types de photobooths](#types-de-photobooths)
7. [Configuration FAL.AI](#configuration-falai)

---

## 🎯 Vue d'ensemble

Le système Photobooth IA permet de transformer des photos capturées en temps réel en appliquant différents styles artistiques grâce à l'intelligence artificielle.

### Flux utilisateur
```
1. Page d'accueil (sélection projet)
   ↓
2. Instructions d'utilisation
   ↓
3. Sélection du style
   ↓
4. Capture photo (webcam)
   ↓
5. Génération IA
   ↓
6. Affichage résultat + QR code
   ↓
7. Sauvegarde S3 + Database
```

---

## 🏗️ Architecture technique

### Stack technique
- **Frontend**: Next.js 14.2.28 (React)
- **Backend**: Next.js API Routes
- **Base de données**: Supabase (PostgreSQL)
- **Stockage**: AWS S3 (bucket: leeveostockage, région: eu-west-3)
- **IA**: FAL.AI (plateforme d'API d'IA)
- **Paiements**: Stripe
- **Animations**: Framer Motion

### Structure des dossiers photobooths
```
app/
├── photobooth/              # Photobooth standard (face swap)
├── photobooth-premium/      # Version premium avec plus de styles
├── photobooth-simple/       # Version simplifiée
├── photobooth-ia/          # Version IA avancée
├── photobooth-avatar/      # Génération d'avatars
├── photobooth-coiffure/    # Essayage coiffures
├── photobooth-logo/        # Avec logo personnalisé
├── photobooth-boomerang/   # Mode boomerang
└── photobooth2/            # Version avec hidream (image-to-image)
```

---

## 🤖 Modèles IA utilisés

### 1. **easel-ai/advanced-face-swap**
**Utilisé par**: photobooth, photobooth-premium, photobooth-simple, photobooth-ia

**Paramètres**:
```javascript
{
  face_image_0: "data:image/jpeg;base64,...", // Photo capturée
  gender_0: "male" | "female",                // Genre détecté
  target_image: "https://...",                // Image de style
  workflow_type: "target_hair" | "user_hair" // Cheveux à préserver
}
```

**Workflow type**:
- `target_hair`: Préserve les cheveux du mannequin (par défaut)
- `user_hair`: Préserve les cheveux de l'utilisateur

**Temps de traitement**: 10-30 secondes

---

### 2. **easel-ai/easel-avatar**
**Utilisé par**: photobooth-avatar

**Paramètres**:
```javascript
{
  face_image_0: "data:image/jpeg;base64,...", // Photo capturée
  gender_0: "male" | "female",                // Genre
  prompt: "Style description..."              // Description du style souhaité
}
```

**Exemple de prompt**:
```
"Professional business portrait, studio lighting, wearing elegant suit"
```

**Temps de traitement**: 15-40 secondes

---

### 3. **fal-ai/hidream-i1-full/image-to-image**
**Utilisé par**: photobooth2

**Paramètres**:
```javascript
{
  prompt: "A beautiful portrait...",          // Description du style
  image_url: "data:image/jpeg;base64,...",   // Photo capturée
  num_inference_steps: 50,                    // Qualité (plus = mieux)
  guidance_scale: 16,                         // Force du prompt
  strength: 0.29                              // Transformation (0-1)
}
```

**Spécificités**:
- Plus flexible pour les transformations artistiques
- Meilleur contrôle sur le niveau de transformation
- Utilisé pour les styles artistiques (peinture, aquarelle, etc.)

**Temps de traitement**: 20-50 secondes

---

## 🔄 Workflow complet

### Étape 1: Initialisation du projet
```javascript
// Récupération des données projet depuis Supabase
const { data: project } = await supabase
  .from('projects')
  .select('*')
  .eq('slug', slug)
  .single();

// Extraction des couleurs personnalisées
const primaryColor = project.primary_color || '#4F46E5';
const secondaryColor = project.secondary_color || '#10B981';
```

### Étape 2: Sélection du style
Les styles sont stockés dans `/app/photobooth-ia/admin/components/styleTemplatesData.json`

**Structure d'un style**:
```json
{
  "name": "Peinture à l'huile",
  "gender": "g",                    // g=général, m=homme, f=femme
  "style_key": "oil_painting",
  "description": "Style peinture à l'huile impressionniste",
  "preview_image": "https://...",
  "prompt": "Transform this portrait into an impressionist oil painting...",
  "variations": 1
}
```

**Stockage localStorage**:
```javascript
localStorage.setItem('selectedStyleId', styleId);
localStorage.setItem('selectedStyleImage', styleImageUrl);
localStorage.setItem('styleGender', gender);
```

### Étape 3: Capture photo

**Initialisation webcam**:
```javascript
navigator.mediaDevices.getUserMedia({ 
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 }
  } 
})
```

**Capture canvas**:
```javascript
const canvas = document.createElement('canvas');
canvas.width = video.videoWidth;
canvas.height = video.videoHeight;
const ctx = canvas.getContext('2d');
ctx.drawImage(video, 0, 0);

const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
localStorage.setItem('faceImage', imageDataUrl);
```

### Étape 4: Génération IA

**Configuration FAL.AI**:
```javascript
fal.config({
  requestMiddleware: fal.withProxy({
    targetUrl: '/api/fal/proxy',
  }),
});
```

**Appel API**:
```javascript
const result = await fal.subscribe(
  'easel-ai/advanced-face-swap',
  {
    input: {
      face_image_0: imageFile,
      gender_0: gender,
      target_image: styleFix,
      workflow_type: "target_hair"
    },
    pollInterval: 5000,
    logs: true,
    onQueueUpdate: (update) => {
      // Mise à jour de la progression
      setElapsedTime(Date.now() - startTime);
      setLogs(update.logs.map(log => log.message));
    }
  }
);
```

**Métadonnées stockées**:
```javascript
const generationMetadata = {
  requestTime: new Date().toISOString(),
  processingTime: Date.now() - startTime,
  modelUsed: 'easel-ai/advanced-face-swap',
  parameters: {...},
  projectId: project.id,
  styleId: styleId,
  requestId: result.requestId
};
localStorage.setItem('falGenerationMetadata', JSON.stringify(generationMetadata));
```

### Étape 5: Sauvegarde et affichage

**Upload S3**:
```javascript
const uploadParams = {
  Bucket: 'leeveostockage',
  Key: `projects/${project.id}/${fileName}`,
  Body: buffer,
  ContentType: 'image/jpeg'
};

await s3Client.send(new PutObjectCommand(uploadParams));
const s3Url = `https://leeveostockage.s3.eu-west-3.amazonaws.com/${uploadParams.Key}`;
```

**Enregistrement base de données**:
```javascript
await supabase.from('sessions').insert({
  project_id: project.id,
  result_s3_url: s3Url,
  result_image_url: imageResultAI,
  user_phone: userPhone,
  user_email: userEmail,
  created_at: new Date().toISOString()
});
```

**Génération QR code**:
```javascript
<QRCodeCanvas
  value={imageUrl}
  size={256}
  level="H"
  includeMargin={true}
/>
```

---

## 📝 Structure des prompts

Les prompts sont organisés par **collections** dans `styleTemplatesData.json`:

### Collections principales

#### 1. **Paint Magic** (Styles artistiques)
```json
{
  "id": "paint-magic",
  "name": "Collection Paint Magic",
  "description": "Tous les styles de peinture...",
  "compatibleWith": ["premium"],
  "styles": [
    {
      "name": "Peinture à l'huile",
      "prompt": "Transform this portrait into an impressionist oil painting with vibrant colors and visible brushstrokes"
    }
  ]
}
```

#### 2. **World Cup Football** (Pays)
```json
{
  "id": "world-cup-football",
  "name": "Coupe du Monde de Football",
  "description": "Soutenez votre équipe nationale...",
  "styles": [
    {
      "name": "France",
      "prompt": "Soccer fan wearing France national team jersey, blue white red colors, Allianz Riviera stadium background, French flag face paint, enthusiastic supporter"
    }
  ]
}
```

#### 3. **Fashion & Style** (Mode professionnelle)
```json
{
  "name": "Business professionnel",
  "prompt": "Professional business portrait, elegant suit, office background, confident pose, studio lighting"
}
```

### Règles des prompts

1. **Langue**: Toujours en anglais
2. **Structure**: `[Action] + [Style] + [Details] + [Lighting/Background]`
3. **Longueur**: 10-30 mots pour l'efficacité
4. **Spécificité**: Plus c'est précis, meilleur est le résultat

**Exemples de bons prompts**:
```
✅ "Transform into cyberpunk character, neon lights, futuristic cityscape, purple and blue tones"
✅ "Victorian era portrait, oil painting style, baroque frame, candlelit atmosphere"
✅ "Superhero costume, dynamic pose, city rooftop, dramatic clouds, action movie lighting"
```

**Prompts à éviter**:
```
❌ "Make it cool" (trop vague)
❌ "Transform" (pas assez descriptif)
❌ Long paragraphe de 100+ mots (trop complexe)
```

---

## 🎭 Types de photobooths

### 1. **Photobooth Standard** (`/photobooth/[slug]`)
- **Modèle**: easel-ai/advanced-face-swap
- **Usage**: Face swap avec mannequins
- **Workflow**: target_hair (cheveux du mannequin)

### 2. **Photobooth Premium** (`/photobooth-premium/[slug]`)
- **Modèle**: easel-ai/advanced-face-swap
- **Différence**: Plus de styles disponibles
- **Collections**: Paint Magic, Fashion, Transformations

### 3. **Photobooth Avatar** (`/photobooth-avatar/[slug]`)
- **Modèle**: easel-ai/easel-avatar
- **Usage**: Génération d'avatars professionnels
- **Particularité**: Utilise des prompts textuels uniquement

### 4. **Photobooth2** (`/photobooth2/[slug]`)
- **Modèle**: fal-ai/hidream-i1-full/image-to-image
- **Usage**: Transformations artistiques avancées
- **Force**: Contrôle précis du niveau de transformation

### 5. **Photobooth Coiffure** (`/photobooth-coiffure/[slug]`)
- **Modèle**: easel-ai/advanced-face-swap
- **Workflow**: user_hair (préserve cheveux utilisateur)
- **Usage**: Essayage de coiffures

---

## ⚙️ Configuration FAL.AI

### Variables d'environnement
```bash
# Option 1: Clé unique
FAL_KEY=your_fal_key_here

# Option 2: ID + Secret
FAL_KEY_ID=your_key_id
FAL_KEY_SECRET=your_key_secret
```

### Proxy Next.js
Fichier: `/app/api/fal/proxy/route.ts`

```typescript
export async function POST(req: NextRequest) {
  const target = process.env.FAL_TARGET_URL || 'https://queue.fal.run';
  // Proxy les requêtes vers FAL.AI
}
```

### Limites et quotas

**FAL.AI**:
- Rate limit: Selon votre plan (Basic/Pro/Enterprise)
- Temps max par requête: 60 secondes
- Taille max image: 10MB

**Application**:
- Polling interval: 5000ms (5 secondes)
- Timeout: 60 secondes
- Retry automatique: 2-3 tentatives selon le type de projet

---

## 📊 Métriques de performance

### Temps de génération moyens
- **Face swap simple**: 10-15 secondes
- **Face swap complexe**: 20-30 secondes
- **Avatar generation**: 15-25 secondes
- **Image-to-image**: 25-40 secondes

### Facteurs d'impact
1. **Résolution de l'image** (plus haute = plus lent)
2. **Complexité du style** (face swap < avatar < image-to-image)
3. **Charge serveur FAL.AI** (varie selon l'heure)
4. **Nombre d'inference steps** (pour hidream)

---

## 🔐 Sécurité et quotas

### Système de quotas
```javascript
// Vérification avant génération
const { canGenerate, remainingQuota } = await checkQuotaStatus(userId);

if (!canGenerate) {
  return { error: 'Quota épuisé', remainingQuota: 0 };
}

// Consommation après génération
await consumeQuota(userId, projectId, sessionId);
```

### Modération
Les images peuvent être modérées avant affichage public:
```javascript
.is('moderation', null) // Seulement les images non modérées
```

---

## 🎨 Ajout de nouveaux styles

### 1. Éditer styleTemplatesData.json
```json
{
  "name": "Nouveau style",
  "gender": "g",
  "style_key": "nouveau_style_key",
  "description": "Description du style",
  "preview_image": "https://...",
  "prompt": "Detailed prompt describing the transformation",
  "variations": 1
}
```

### 2. Upload image preview
```bash
# Upload vers S3
aws s3 cp preview.jpg s3://leeveostockage/style/nouveau-style.jpg --acl public-read
```

### 3. Tester localement
```bash
npm run dev
# Naviguer vers /photobooth-ia/[slug]/style
# Sélectionner le nouveau style
# Capturer une photo test
```

### 4. Commit et push
```bash
git add app/photobooth-ia/admin/components/styleTemplatesData.json
git commit -m "feat: Ajout du style [Nom du style]"
git push
```

---

## 📱 Utilisation en production

### URL structure
```
https://photobooth.waibooth.app/photobooth-premium/cafe-oz
                                    ↑                  ↑
                                  Type              Slug projet
```

### Paramètres disponibles
- `?fullscreen=true`: Mode plein écran
- `?projectId=xxx`: ID direct du projet
- `?debug=true`: Mode debug avec logs détaillés

---

## 🐛 Debugging

### Logs côté client
```javascript
console.log('FAL.AI input:', {
  face_image: imageFile ? 'base64_data...' : null,
  gender: gender,
  target_image: styleImage,
  workflow_type: workflowType
});
```

### Logs côté serveur
```javascript
// Dans /api/fal/proxy/route.ts
console.log('🔐 FAL API Auth configured');
console.log('📤 Proxying request to FAL.AI');
```

### Métadonnées localStorage
```javascript
// Récupérer les métadonnées de génération
const metadata = JSON.parse(localStorage.getItem('falGenerationMetadata'));
console.log('Generation details:', metadata);
```

---

## 📚 Ressources

### Documentation officielle
- [FAL.AI Docs](https://fal.ai/docs)
- [Next.js](https://nextjs.org/docs)
- [Supabase](https://supabase.io/docs)

### APIs internes
- `/api/fal/proxy` - Proxy pour FAL.AI
- `/api/quota-manager` - Gestion des quotas
- `/api/s3-upload` - Upload vers S3

### Base de données
**Tables principales**:
- `projects` - Configuration des projets
- `sessions` - Photos générées
- `admin_users` - Utilisateurs admin
- `admin_payments` - Paiements et quotas
- `quota_usage` - Consommation des quotas

---

## ✨ Résumé

Le système Photobooth IA est une application complète qui:

1. ✅ Capture des photos en temps réel via webcam
2. ✅ Applique des transformations IA via FAL.AI
3. ✅ Gère 3 modèles IA différents selon le besoin
4. ✅ Stocke les résultats sur S3 et Supabase
5. ✅ Génère des QR codes pour le partage
6. ✅ Gère un système de quotas Stripe
7. ✅ Supporte 9 types de photobooths différents
8. ✅ Offre 200+ styles dans 20+ collections

**Technologies clés**: Next.js, FAL.AI, Supabase, AWS S3, Stripe
**Modèles IA**: advanced-face-swap, easel-avatar, hidream-i1-full
**Prompts**: 200+ prompts optimisés en anglais
