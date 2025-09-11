import { GoogleGenAI } from '@google/genai';

// Test simple de l'API Gemini
async function testGemini() {
  try {
    console.log('Testing Gemini API...');
    
    const ai = new GoogleGenAI({
      apiKey: 'AIzaSyB8_lR98x-JEwltGMEDj2ObZHYXj3kXSI8'
    });
    
    // Test simple avec du texte seulement
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        { text: "Explain how AI works in a few words" }
      ],
    });
    
    console.log('Success! Response:', response.candidates[0].content.parts[0].text);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testGemini();
