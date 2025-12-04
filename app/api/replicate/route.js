import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { prompt, image, model, version, input } = body;

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { success: false, error: "La clé API Replicate n'est pas configurée" },
        { status: 500 }
      );
    }

    // Construction du payload pour Replicate
    // Si un modèle spécifique est demandé, on l'utilise
    // Sinon on utilise une configuration par défaut (à adapter selon vos besoins)
    const modelVersion = version || "8cf967d36833c9cf47617ce3376e1a63a3e6710494d9a9744274093764f877d3"; // Exemple de version par défaut
    
    // Préparation de l'input selon le modèle
    const inputData = input || {
      prompt: prompt,
      image: image,
      // Autres paramètres par défaut si nécessaire
    };

    console.log("Envoi requête Replicate:", { model, version: modelVersion });

    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: modelVersion,
        input: inputData,
      }),
    });

    if (response.status !== 201) {
      let error = await response.text();
      console.error("Erreur Replicate:", error);
      return NextResponse.json(
        { success: false, error: error },
        { status: 500 }
      );
    }

    const prediction = await response.json();
    console.log("Prédiction créée:", prediction.id);

    // Polling pour attendre le résultat
    let result = prediction;
    while (
      result.status !== "succeeded" &&
      result.status !== "failed" &&
      result.status !== "canceled"
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const pollResponse = await fetch(
        "https://api.replicate.com/v1/predictions/" + prediction.id,
        {
          headers: {
            "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
      result = await pollResponse.json();
    }

    if (result.status === "succeeded") {
      return NextResponse.json({
        success: true,
        output: result.output,
        id: result.id
      });
    } else {
      return NextResponse.json(
        { success: false, error: "La génération a échoué: " + result.status },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Erreur API Replicate:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
