# 🚨 CONFIGURATION SUPABASE - Erreur "Database error saving new user"

## Problème identifié
L'authentification OAuth fonctionne maintenant correctement, mais Supabase ne peut pas créer l'utilisateur dans la base de données.

## ✅ Solutions à appliquer dans Supabase Dashboard

### 1. Aller sur votre dashboard Supabase
URL : https://supabase.com/dashboard/project/gyohqmahwntkmebayeej

### 2. Configuration Authentication > Settings
1. Cliquez sur **Authentication** dans le menu de gauche
2. Allez dans **Settings** 
3. Vérifiez ces paramètres :

#### Site URL :
```
https://photobooth.waibooth.app
```

#### Redirect URLs (sous Additional Redirect URLs) :
```
https://photobooth.waibooth.app/photobooth-ia/admin/auth/callback
https://photobooth.waibooth.app/*
```

### 3. Configuration Authentication > Providers > Google
1. Allez dans **Authentication** > **Providers**
2. Cliquez sur **Google**
3. Vérifiez :
   - ✅ **Enabled** : ON
   - **Client ID** : `861872459075-0rddreeofg3us5falu78gpfp5qu5qr0q.apps.googleusercontent.com`
   - **Client Secret** : `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`
   - **Redirect URL** : `https://gyohqmahwntkmebayeej.supabase.co/auth/v1/callback`

### 4. Vérifier les politiques RLS (Row Level Security)
1. Allez dans **Authentication** > **Policies**
2. Assurez-vous que la table `auth.users` a les bonnes politiques
3. Si nécessaire, créez une politique pour permettre l'insertion :

```sql
-- Permettre aux utilisateurs de créer leur propre profil
CREATE POLICY "Users can create their own profile" ON auth.users
FOR INSERT WITH CHECK (true);
```

### 5. Configuration avancée - Authentication > Settings > Advanced
Vérifiez ces paramètres :
- **Enable email confirmations** : Peut être désactivé pour les tests
- **Enable signup** : ✅ Activé
- **Enable manual linking** : ✅ Activé

## 🧪 Test après configuration
1. Videz le cache du navigateur
2. Testez en mode navigation privée
3. Vérifiez les logs dans Supabase Dashboard > Logs

## 🔍 Si l'erreur persiste
Consultez les logs détaillés :
1. Supabase Dashboard > Logs > Auth logs
2. Recherchez l'erreur "Database error saving new user"
3. Partagez le message d'erreur complet