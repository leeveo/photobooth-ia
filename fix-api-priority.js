// SOLUTION TEMPORAIRE : Modifier la priorité des services IA
// Remplacer generateImageGemini par generateImageAzure dans page.js

const generateImageAzureFirst = async () => {
  setProcessing(true);
  setError(null);
  setLogs([]);
  setElapsedTime(0);

  const start = Date.now();
  let progressTimer;
  
  progressTimer = setInterval(() => {
      const elapsed = Date.now() - start;
      setElapsedTime(elapsed);
      
      const elapsedSeconds = Math.floor(elapsed / 1000);
      const maxTime = (settings?.max_processing_time || 60) * 1000;
      let timeBasedProgress;
      
      if (elapsedSeconds < 5) {
        timeBasedProgress = Math.min(20, (elapsed / 5000) * 20);
      } else if (elapsedSeconds < 10) {
        timeBasedProgress = 25 + Math.min(25, ((elapsed - 5000) / 5000) * 25);
      } else if (elapsedSeconds < 15) {
        timeBasedProgress = 50 + Math.min(25, ((elapsed - 10000) / 5000) * 25);
      } else if (elapsedSeconds < 20) {
        timeBasedProgress = 75 + Math.min(15, ((elapsed - 15000) / 5000) * 15);
      } else {
        timeBasedProgress = Math.min(95, 90 + ((elapsed - 20000) / (maxTime - 20000)) * 5);
      }
      
      setLoadingProgress(timeBasedProgress);
  }, 500);
  
  try {
    const prompt = localStorage.getItem('stylePrompt') || "portrait photo";
    const image = imageFile; // base64

    console.log('[AI] Using Azure AI as PRIMARY service');
    setLogs(["🔄 Utilisation du service Azure AI..."]);

    const reqBody = {
      input: {
        prompt: prompt,
        input_image: image
      }
    };

    console.log('[AI] Starting request to /api/azure-ai...');
    
    const response = await fetch('/api/azure-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Azure AI] HTTP Error:', { status: response.status, errorText });
      throw new Error(`Erreur Azure AI: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || "Erreur lors de la génération");
    }

    const resultImageUrl = data.output;
    console.log('[Azure AI] Image générée avec succès:', resultImageUrl);
    setLogs(prev => [...prev, "✅ Image générée par Azure AI !"]);

    // Continuer avec le reste du traitement (watermark, upload S3, etc.)
    // [Code existant pour fetchProjectThumbnail, combineImages, upload S3...]
    
    // Redirection finale
    setProcessing(false);
    router.push(`/photobooth-coiffure/${slug}/result`);

  } catch (err) {
    console.error("Erreur Azure AI:", err);
    setError(err.message);
    setProcessing(false);
    
    if (progressTimer) {
      clearInterval(progressTimer);
    }
  }
};

// Instructions pour modifier le bouton :
// Dans page.js, ligne ~2600+ où vous avez :
// onClick={() => generateImageGemini()}
// Remplacer par :
// onClick={() => generateImageAzureFirst()}