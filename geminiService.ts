
import { GoogleGenAI } from "@google/genai";
import { Product } from "./types";

// Always initialize GoogleGenAI right before the call to ensure fresh configuration
export const getInventoryAdvice = async (products: Product[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const productSummary = products.map(p => `${p.name} (Stock: ${p.stock}, Mínimo: ${p.minStock})`).join(', ');
  
  // Using gemini-3-pro-preview for complex reasoning task (inventory analysis)
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Analiza este inventario de tienda deportiva y dame 3 consejos estratégicos breves basados en estos datos: ${productSummary}`,
    config: {
      systemInstruction: "Eres un consultor experto en retail deportivo. Tu objetivo es ayudar al dueño de la tienda a optimizar su stock y ventas. Responde en español de forma concisa, profesional y con formato de puntos.",
      temperature: 0.7,
    },
  });

  return response.text;
};

export const generateSlogan = async (storeName: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Genera 5 slogans creativos, cortos y pegajosos para una tienda deportiva llamada "${storeName}".`,
  });
  return response.text;
};
