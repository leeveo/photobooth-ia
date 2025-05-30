```javascript
// Ajouter cette configuration en haut du fichier
export const config = {
  runtime: 'edge',
  regions: ['fra1'],
};

// ...existing code...

// Replace any direct ffmpeg usage with a more lightweight approach or consider
// moving heavy processing to an external service like AWS Lambda or Replicate.ai
```