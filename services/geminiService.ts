
import { GoogleGenAI } from "@google/genai";

export const getSmartReplySuggestion = async (context: string): Promise<string> => {
  // Use process.env.API_KEY directly as per SDK guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a helpful customer support agent. Based on the following conversation history, suggest a professional, concise, and empathetic response. 
      History:
      ${context}`,
      config: {
        temperature: 0.7,
        // Avoid setting maxOutputTokens without thinkingBudget to prevent empty responses
      },
    });

    // response.text is a property, not a method
    return response.text?.trim() || "I'm sorry, I couldn't generate a suggestion right now.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Failed to get AI suggestion.";
  }
};