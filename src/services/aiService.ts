import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeImage(base64Data: string, mimeType: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: "Analyze this image and provide a highly detailed, raw, and objective description for a photography prompt. Focus on describing 'the scene exactly as an amateur would catch it'. Mention specific objects, messy details, lighting quality (e.g., overhead fluorescent, harsh sunlight, dim room), and simple positioning. Avoid any artistic or flowery language. The goal is a ground-truth description for an unpolished 'Nano Banana' style realistic image. Output only the descriptive paragraph.",
          },
        ],
      },
    });

    return response.text || "A scene captured in reality.";
  } catch (error) {
    console.error("AI Analysis Error:", error);
    throw new Error("Failed to analyze image. Please check your connectivity.");
  }
}
