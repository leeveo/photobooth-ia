// Script pour tester la connexion à fal.ai
const https = require('https');
const dns = require('dns');

console.log('Test de connexion à api.fal.ai...');

// Test DNS
dns.resolve4('api.fal.ai', (err, addresses) => {
  if (err) {
    console.error('Erreur DNS:', err);
    console.log('Essayez d\'ajouter cette entrée à votre fichier hosts:');
    console.log('104.18.6.190 api.fal.ai');
  } else {
    console.log('Résolution DNS réussie:', addresses);
    
    // Test HTTPS
    const req = https.get('https://api.fal.ai/v1/health', (res) => {
      console.log('Statut de la réponse:', res.statusCode);
      console.log('Headers:', res.headers);
      
      res.on('data', (chunk) => {
        console.log('Données reçues:', chunk.toString());
      });
      
      res.on('end', () => {
        console.log('Requête terminée');
      });
    });
    
    req.on('error', (e) => {
      console.error('Erreur de requête:', e);
    });
    
    req.end();
  }
});

// Pour exécuter ce script: node checkFalai.js
