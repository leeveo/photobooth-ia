// TEST DU SYSTÈME DE FALLBACK
// Ajoutez ce code temporairement au début de votre fonction generateImageReplicate pour tester

console.log("🧪 MODE TEST TIMEOUT - Pour tester le fallback");

// 1. TEST TIMEOUT : Décommentez cette ligne pour simuler un Replicate lent
// await new Promise(resolve => setTimeout(resolve, 10000)); // Simule 10s d'attente

// 2. TEST ERREUR : Décommentez cette ligne pour simuler une erreur Replicate  
// throw new Error("Test erreur Replicate simulée");

// 3. TEST NORMAL : Laissez tout commenté pour un fonctionnement normal
