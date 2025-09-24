# 🚨 GUIDE URGENT - Configuration Google Cloud Console

## ⚡ Action immédiate requise

### 1. 🔐 Accéder à Google Cloud Console
**Lien direct** : https://console.cloud.google.com/

### 2. 📋 Sélectionner/Créer le projet
- **Nom du projet** : `photobooth-ia` 
- **Client ID existant** : `861872459075-0rddreeofg3us5falu78gpfp5qu5qr0q`

### 3. 🛡️ Configurer l'écran de consentement OAuth
**Navigation** : `APIs & Services > OAuth consent screen`

**Configuration requise** :
- **Type d'utilisateur** : External
- **Nom de l'application** : "PhotoBooth IA"
- **E-mail de support** : votre@email.com
- **Domaine de l'application** : `waibooth.app`
- **Domaines autorisés** : `waibooth.app`
- **URIs de la politique de confidentialité** : https://photobooth.waibooth.app/privacy
- **URIs des conditions d'utilisation** : https://photobooth.waibooth.app/terms

### 4. 🔗 Vérifier les identifiants OAuth 2.0
**Navigation** : `APIs & Services > Credentials`

**URIs de redirection autorisés** (CRUCIAL) :
```
https://photobooth.waibooth.app/photobooth-ia/admin/auth/callback
http://localhost:3000/photobooth-ia/admin/auth/callback
```

**Domaines JavaScript autorisés** :
```
https://photobooth.waibooth.app
http://localhost:3000
```

### 5. 📤 Publier l'application
**Navigation** : `OAuth consent screen > Publishing status`
- Cliquer **"PUBLISH APP"**
- ⚠️ IMPORTANT : Sans cette étape, l'app reste bloquée !

### 6. 🔍 Activer les APIs
**Navigation** : `APIs & Services > Library`
**APIs à activer** :
- ✅ Google OAuth2 API
- ✅ Google People API
- ✅ Google OpenID Connect API

## ⚡ Test immédiat après configuration
Une fois ces étapes effectuées (surtout la PUBLICATION), tester :
https://photobooth.waibooth.app/photobooth-ia/admin/login

## 🆘 Si ça ne marche toujours pas
Vérifier les **erreurs courantes** :
1. Application non publiée (reste en mode développement)
2. Domaines mal configurés
3. URIs de redirection incorrects
4. APIs Google pas activées

**La clé** : L'étape 5 (Publication) est CRUCIALE ! Sans elle, Google bloquera toujours l'authentification.