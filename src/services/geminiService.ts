import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface AppIdea {
  title: string;
  description: string;
  targetAudience: string;
  keyFeatures: string[];
}

export interface RoadmapStep {
  phase: string;
  tasks: string[];
  duration: string;
}

export interface TechStack {
  frontend: string;
  backend: string;
  database: string;
  hosting: string;
  additionalLibraries: string[];
}

export async function generateAppIdeas(niche: string): Promise<AppIdea[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate 3 innovative mobile app ideas for the following niche: ${niche}. 
      Make them practical but creative.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              targetAudience: { type: Type.STRING },
              keyFeatures: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["title", "description", "targetAudience", "keyFeatures"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Error generating ideas:", error);
    throw error;
  }
}

export async function generateRoadmap(idea: string): Promise<RoadmapStep[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Create a 4-phase development roadmap for this app idea: ${idea}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              phase: { type: Type.STRING },
              tasks: { type: Type.ARRAY, items: { type: Type.STRING } },
              duration: { type: Type.STRING }
            },
            required: ["phase", "tasks", "duration"]
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Error generating roadmap:", error);
    throw error;
  }
}

export async function generateTechStack(idea: string): Promise<TechStack> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Recommend a modern tech stack for this app idea: ${idea}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            frontend: { type: Type.STRING },
            backend: { type: Type.STRING },
            database: { type: Type.STRING },
            hosting: { type: Type.STRING },
            additionalLibraries: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["frontend", "backend", "database", "hosting", "additionalLibraries"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error generating tech stack:", error);
    throw error;
  }
}
