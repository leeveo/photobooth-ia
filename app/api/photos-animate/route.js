```javascript
// Add this at the top to make it a streaming API which has higher limits
export const config = {
  runtime: 'edge',
  regions: ['fra1'], // Optionally specify regions
};

// ...existing code...

// Replace any direct ffmpeg usage with a more lightweight approach or consider
// moving heavy processing to an external service like AWS Lambda or Replicate.ai
```