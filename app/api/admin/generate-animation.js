import Replicate from "replicate";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { image, prompt } = req.body;
  if (!image || !prompt) {
    return res.status(400).json({ error: "Image et prompt requis" });
  }

  try {
    const replicate = new Replicate({ apiKey: process.env.REPLICATE_API_TOKEN });
    const input = { image, prompt };

    const output = await replicate.run("wavespeedai/wan-2.1-i2v-480p", { input });

    // output est un array, la vidéo est output[0] ou output.url() selon la version
    let videoUrl = Array.isArray(output) ? output[0] : (output.url ? output.url() : output);

    return res.status(200).json({ videoUrl });
  } catch (error) {
    console.error("Replicate error:", error);
    return res.status(500).json({ error: "Erreur Replicate: " + error.message });
  }
}
