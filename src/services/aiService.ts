import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in the environment.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export async function analyzeImage(base64Data: string, mimeType: string): Promise<string> {
  try {
    const ai = getAI();
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
            text: "Act as a specialized 'Lumen Nano' (formerly Nano Banana) photography prompt engineer. Your goal is to reverse-engineer this image into a raw, high-fidelity amateur photography prompt.\n\n" +
              "CORE DIRECTIVES:\n" +
              "- AESTHETIC: Emulate an unedited, candid snap taken on a high-end smartphone with zero filters. Focus on 'the truth of the moment'.\n" +
              "- DETAILS: Describe messy interiors, tangled wires, half-empty glasses, dust on surfaces, and realistic skin textures (pores, slight shine).\n" +
              "- LIGHTING: Focus on 'unintentional' lighting—harsh overhead LEDs, light leaks, accidental bloom from a window, or high-contrast flash shadows.\n" +
              "- CAMERA SPECS: Include technical metadata like 'iPhone 15 Pro, 24mm f/1.78, ISO 120, 1/60s shutter, HEIF format, zero post-processing'.\n" +
              "- LANGUAGE: Use clinical, descriptive terms. Avoid 'beautiful', 'stunning', or 'artistic'. Instead, use 'neutral', 'overexposed', 'cluttered', 'saturated', or 'motion-blurred'.\n\n" +
              "OUTPUT FORMAT:\n" +
              "Provide ONLY the descriptive text block. Start immediately with the description. Do not include any headers or meta-talk.",
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
