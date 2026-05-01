type GeminiGenerateOptions = {
    model?: 'gemini-2.5-flash' | 'gemini-2.5-pro';
    imageBase64?: string;
    mimeType?: string;
};

const DEFAULT_MODEL: GeminiGenerateOptions['model'] = 'gemini-2.5-flash';

async function requestGemini(prompt: string, options: GeminiGenerateOptions = {}) {
    const response = await fetch('/.netlify/functions/gemini-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            prompt,
            model: options.model || DEFAULT_MODEL,
            imageBase64: options.imageBase64,
            mimeType: options.mimeType,
        }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
        throw new Error(data.error || `Gemini request failed (${response.status})`);
    }

    return data.text || '';
}

export const geminiService = {
    getModel: (modelName: GeminiGenerateOptions['model'] = DEFAULT_MODEL) => ({
        generateContent: async (input: string | Array<string | { text?: string }>) => {
            const prompt = Array.isArray(input)
                ? input.map((part) => typeof part === 'string' ? part : part.text || '').join('\n')
                : input;
            const text = await requestGemini(prompt, { model: modelName });
            return { response: { text: () => text } };
        },
    }),

    generateText: async (prompt: string, model: GeminiGenerateOptions['model'] = DEFAULT_MODEL) => {
        return requestGemini(prompt, { model });
    },

    generateFromImage: async (
        prompt: string,
        imageBase64: string,
        mimeType: string = 'image/jpeg',
        model: GeminiGenerateOptions['model'] = DEFAULT_MODEL,
    ) => {
        return requestGemini(prompt, { model, imageBase64, mimeType });
    },

    getProjectId: () => 'server-side-netlify-gemini',
};
