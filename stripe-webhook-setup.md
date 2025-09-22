# Guide pour configurer les webhooks Stripe en développement local

## Étape 1: Installer Stripe CLI
# Téléchargez depuis : https://stripe.com/docs/stripe-cli
# Ou utilisez winget sur Windows :
winget install stripe.stripe-cli

## Étape 2: Connecter Stripe CLI à votre compte
stripe login

## Étape 3: Écouter les webhooks et les rediriger vers localhost
stripe listen --forward-to localhost:3000/api/stripe-webhook

## Cette commande va :
# 1. Créer un webhook endpoint temporaire sur Stripe
# 2. Rediriger tous les événements vers votre localhost:3000/api/stripe-webhook
# 3. Vous donner un webhook secret temporaire à utiliser

## Étape 4: Copier le webhook secret temporaire
# Stripe CLI va afficher quelque chose comme :
# whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# Remplacez STRIPE_WEBHOOK_SECRET dans votre .env.local

## Étape 5: Tester un paiement
# Faites un nouveau paiement sur votre app
# Stripe CLI va capturer l'événement et l'envoyer à votre webhook local

## Alternative : Simuler un événement directement
stripe trigger checkout.session.completed --add checkout_session:customer_email=jumpwiththedevil.evhtribute@gmail.com --add checkout_session:amount_total=4900

## Note: 
# Le webhook secret dans votre .env.local (whsec_9xVmHbldoVKbxQPuhmlDQYYQzSFFdYtb) 
# est probablement pour la production, pas pour le développement local.