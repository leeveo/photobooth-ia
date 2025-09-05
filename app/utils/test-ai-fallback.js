// Fichier de test pour le système de fallback Azure
// Ce fichier peut être utilisé pour tester les APIs individuellement

const testImageBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";

// Test Replicate API
export async function testReplicate() {
  console.log("🧪 Testing Replicate API...");
  
  const requestBody = {
    model: "black-forest-labs/flux-kontext-pro",
    input: {
      prompt: "a professional portrait photo of a person smiling",
      input_image: testImageBase64,
      output_format: "jpg",
      width: 970,
      height: 651
    }
  };
  
  try {
    const response = await fetch('/api/replicate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    const data = await response.json();
    console.log("Replicate result:", data);
    return { success: response.ok, data, service: 'replicate' };
  } catch (error) {
    console.error("Replicate error:", error);
    return { success: false, error: error.message, service: 'replicate' };
  }
}

// Test Azure AI API
export async function testAzure() {
  console.log("🧪 Testing Azure AI API...");
  
  const requestBody = {
    input: {
      prompt: "a professional portrait photo of a person smiling",
      input_image: testImageBase64
    }
  };
  
  try {
    const response = await fetch('/api/azure-ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    const data = await response.json();
    console.log("Azure result:", data);
    return { success: response.ok, data, service: 'azure' };
  } catch (error) {
    console.error("Azure error:", error);
    return { success: false, error: error.message, service: 'azure' };
  }
}

// Test le système de fallback complet
export async function testFallbackSystem() {
  console.log("🧪 Testing complete fallback system...");
  
  const requestBody = {
    model: "black-forest-labs/flux-kontext-pro",
    input: {
      prompt: "a professional portrait photo of a person smiling",
      input_image: testImageBase64,
      output_format: "jpg",
      width: 970,
      height: 651
    }
  };
  
  let resultImageUrl = null;
  let aiSource = 'replicate';
  
  try {
    // Créer une Promise de timeout de 5 secondes
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout Replicate (5 secondes)')), 5000);
    });
    
    // Créer la Promise de requête Replicate
    const replicatePromise = fetch('/api/replicate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    // Faire une course entre timeout et requête
    const response = await Promise.race([replicatePromise, timeoutPromise]);
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.success) {
        const result = data.output;
        resultImageUrl = typeof result === 'string' ? result : 
          Array.isArray(result) ? result[0] : 
          result?.url || result?.image || result;
        
        if (resultImageUrl) {
          console.log('✅ Replicate successful - Image URL:', resultImageUrl);
          aiSource = 'replicate';
        } else {
          throw new Error("Aucune URL d'image dans la réponse Replicate");
        }
      } else {
        throw new Error(data.error || "Erreur Replicate");
      }
    } else {
      const errorText = await response.text();
      throw new Error(`Erreur HTTP Replicate: ${response.status} ${errorText}`);
    }
    
  } catch (replicateError) {
    console.log('❌ Replicate failed:', replicateError.message);
    console.log('🔄 Fallback to Azure AI...');
    
    // Fallback vers Azure AI
    try {
      const azureResponse = await fetch('/api/azure-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: {
            prompt: requestBody.input.prompt,
            input_image: requestBody.input.input_image
          }
        }),
      });
      
      if (!azureResponse.ok) {
        const azureErrorText = await azureResponse.text();
        throw new Error(`Erreur Azure AI: ${azureResponse.status} ${azureErrorText}`);
      }
      
      const azureData = await azureResponse.json();
      
      if (azureData.success && azureData.output) {
        resultImageUrl = azureData.output;
        console.log('✅ Azure AI successful - Image URL:', resultImageUrl);
        aiSource = 'azure';
      } else {
        throw new Error(azureData.error || "Erreur Azure AI");
      }
      
    } catch (azureError) {
      console.error('❌ Azure fallback also failed:', azureError.message);
      throw new Error(`Tous les services IA ont échoué. Replicate: ${replicateError.message}. Azure: ${azureError.message}`);
    }
  }
  
  return {
    success: !!resultImageUrl,
    imageUrl: resultImageUrl,
    aiSource: aiSource,
    message: `Image générée avec succès via ${aiSource.toUpperCase()}`
  };
}

// Fonction pour tester depuis la console du navigateur
window.testAI = {
  testReplicate,
  testAzure,
  testFallbackSystem
};

console.log("🧪 Fonctions de test disponibles:");
console.log("- window.testAI.testReplicate() - Test Replicate uniquement");
console.log("- window.testAI.testAzure() - Test Azure uniquement");
console.log("- window.testAI.testFallbackSystem() - Test le système complet de fallback");
