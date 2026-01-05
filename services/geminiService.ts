import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client
// Assumption: process.env.API_KEY is available.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Converts a File object to a Base64 string.
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the Data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Edits an image using Gemini based on a text prompt.
 * Uses 'gemini-2.5-flash-image' which supports text + image input.
 */
export const editImageWithGemini = async (
  imageFile: File, 
  prompt: string
): Promise<string> => {
  try {
    const base64Image = await fileToBase64(imageFile);
    
    // Using gemini-2.5-flash-image for image editing/variation tasks
    const modelId = 'gemini-2.5-flash-image';

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            text: prompt + " (Return only the image, high quality)",
          },
          {
            inlineData: {
              mimeType: imageFile.type,
              data: base64Image
            }
          }
        ]
      }
    });

    // Check for inlineData (generated image)
    // The response structure for images in generateContent often puts the image in parts
    const candidates = response.candidates;
    if (candidates && candidates[0] && candidates[0].content && candidates[0].content.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("Görsel oluşturulamadı. Lütfen tekrar deneyin.");
  } catch (error) {
    console.error("Gemini Edit Image Error:", error);
    throw error;
  }
};

/**
 * Analyzes a video file and provides a description/answer.
 * Uses 'gemini-2.5-flash-latest' which has strong video understanding capabilities.
 */
export const analyzeVideoWithGemini = async (
  videoFile: File, 
  prompt: string
): Promise<string> => {
  try {
    const base64Video = await fileToBase64(videoFile);
    
    // gemini-2.5-flash-latest or gemini-2.5-flash-lite-latest are great for multimodal
    const modelId = 'gemini-2.5-flash-latest';

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            text: prompt,
          },
          {
            inlineData: {
              mimeType: videoFile.type,
              data: base64Video
            }
          }
        ]
      }
    });

    return response.text || "Video analiz edilemedi.";
  } catch (error) {
    console.error("Gemini Video Analyze Error:", error);
    throw error;
  }
};
