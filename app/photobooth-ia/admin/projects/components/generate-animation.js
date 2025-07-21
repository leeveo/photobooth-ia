import Replicate from "replicate";

export async function POST(request) {
  try {
    const body = await request.json();
    const { image, prompt, output_format } = body;
    if (!image || !prompt) {
      return new Response(JSON.stringify({ error: "Image et prompt requis" }), { status: 400 });
    }

    const replicate = new Replicate({ apiKey: process.env.REPLICATE_API_TOKEN });
    const input = {
      image,
      prompt,
      output_format: output_format || "landscape", // "landscape" (horizontal) ou "portrait" (vertical)
    };
    const output = await replicate.run("wavespeedai/wan-2.1-i2v-480p", { input });

    // Selon la doc, output est un array d'URL
    let videoUrl = Array.isArray(output) ? output[0] : output;

    return new Response(JSON.stringify({ videoUrl }), { status: 200 });
  } catch (error) {
    console.error("Replicate error:", error);
    return new Response(JSON.stringify({ error: "Erreur Replicate: " + error.message }), { status: 500 });
  }
}