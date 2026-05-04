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

export async function analyzeImage(base64Data: string, mimeType: string, negativePrompt?: string): Promise<string> {
  try {
    const ai = getAI();
    const negativeInstruction = negativePrompt && negativePrompt.trim() 
      ? `\n\nNEGATIVE CONSTRAINTS (EXCLUDE THESE): ${negativePrompt.trim()}` 
      : "";

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
            text: "Act as an elite 'Lumen Nano' prompt engineer. Your sole mission is to reverse-engineer this image into an ultra-realistic, forensic descriptive prompt that is indistinguishable from a raw, high-fidelity photograph. You MUST avoid the 'AI-generated' aesthetic at all costs.\n\n" +
              "DIALECTIC DIRECTIVES FOR PHOTOGRAPHIC TRUTH:\n" +
              "- ANTI-AI POLICIES: Forbid perfect symmetry, ethereal lighting, or 'stunning' compositions. Instead, describe mundane, 'ugly', or boring details—a slightly scuffed baseboard, a dead pixel in the dark corner, a faint water stain on a ceiling, or the cheap plastic texture of a generic remote control.\n" +
              "- SENSOR & LENS FIDELITY: Describe the artifacts of a real camera: slight purple fringing (chromatic aberration) on high-contrast edges, thin digital noise in the shadows of underexposed areas, a faint greasy lens bloom around bright light sources, and the specific flat depth-of-field of a smartphone sensor.\n" +
              "- LIGHTING FORENSICS: Detail 'unintentional' lighting. Describe the harsh, flickering 60Hz hum of an overhead fluorescent, the cold blue cast of a digital screen reflecting on a face, or the flattening, overexposed effect of a direct smartphone flash that kills depth.\n" +
              "- MICRO-CHAOS: Detail the entropy of a lived-in space—tangled black charging cables on a dusty floor, a half-drunk glass of water with visible condensation rings, messy stacks of mail, or the visible weave and stray threads of a cheap polyester sofa.\n" +
              "- ANATOMICAL HONESTY: If people are visible, describe them without filters: visible skin pores, slight sweat or oil on the T-zone, uneven hair strands, messy eyebrows, and expressions that are candid, mid-sentence, or non-posed.\n" +
              "- TECHNICAL SIGNATURE: Conclude with a clinical metadata block: 'Shot on iPhone 15 Pro, 24mm Main Lens, f/1.78, ISO 160-320 range, 1/100s shutter, Auto-HDR artifacting present, HEIF raw binary, completely unedited, zero post-processing, native sensor noise profile'.\n\n" +
              "OUTPUT FORMAT:\n" +
              "Provide a dense, Forensic-Descriptive block. Do not use any flowery adjectives like 'beautiful', 'magical', or 'artistic'. Use objective, cold, clinical language. Describe the scene's flaws as its primary features. Start immediately with the description." +
              negativeInstruction,
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
