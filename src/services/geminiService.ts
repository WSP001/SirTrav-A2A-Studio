import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || "";
const PROJECT_ID = "gen-lang-client-0770554704"; // Your configured Project ID

if (!API_KEY) {
    console.warn("Missing VITE_GOOGLE_API_KEY in environment variables");
}

const genAI = new GoogleGenerativeAI(API_KEY);

export const geminiService = {
    // Get the Generative Model
    getModel: (modelName: string = "gemini-pro") => {
        return genAI.getGenerativeModel({ model: modelName });
    },

    // Generate content from text
    generateText: async (prompt: string) => {
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error("Gemini Generate Text Error:", error);
            throw error;
        }
    },

    // Generate content from text and images (multimodal)
    generateFromImage: async (prompt: string, imageBase64: string, mimeType: string = "image/jpeg") => {
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
            const imagePart = {
                inlineData: {
                    data: imageBase64,
                    mimeType
                },
            };

            const result = await model.generateContent([prompt, imagePart]);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error("Gemini Vision Error:", error);
            throw error;
        }
    },

    // Project ID Accessor
    getProjectId: () => PROJECT_ID
};
