import { GoogleGenAI } from '@google/genai';

// Test simple de l'API Gemini
async function testGemini() {
  try {
    console.log('Testing Gemini API...');
    
    const ai = new GoogleGenAI({
      apiKey: 'AIzaSyB8_lR98x-JEwltGMEDj2ObZHYXj3kXSI8'
    });
    
    // Test avec le modèle d'édition d'images
    console.log('Testing image model...');
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents: [
        { text: "Can you generate or edit images?" }
      ],
    });
    
    console.log('Image model response:', response.candidates[0].content.parts[0].text);
    
  } catch (error) {
    console.error('Error:', error);
    console.error('Error message:', error.message);
  }
}

testGemini();
