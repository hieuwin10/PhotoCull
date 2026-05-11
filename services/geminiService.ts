
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AnalysisResult, ProcessedImage } from '../types';
import { resizeImageToBase64 } from './imageUtils';

/**
 * Helper to retry API calls on 429/503 errors
 * Optimized for robustness against "Resource Exhausted"
 */
const retryWithBackoff = async <T>(fn: () => Promise<T>, retries = 6, initialDelay = 2000): Promise<T> => {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error: any) {
            const msg = error.toString().toLowerCase();
            // Check for rate limits (429) or server overload (503)
            const isRetryable = msg.includes('429') || 
                                msg.includes('503') || 
                                msg.includes('resource_exhausted') || 
                                msg.includes('quota') ||
                                msg.includes('overloaded') || 
                                msg.includes('fetch failed'); // Network blip
            
            if (isRetryable && i < retries - 1) {
                // Exponential backoff: 2s, 4s, 8s, 16s, 32s...
                const baseDelay = initialDelay * Math.pow(2, i);
                const jitter = Math.random() * 1000;
                const waitTime = baseDelay + jitter;
                
                console.warn(`⚠️ API Busy (${i+1}/${retries}). Waiting ${Math.round(waitTime/1000)}s... Error: ${msg.substring(0, 50)}...`);
                await new Promise(res => setTimeout(res, waitTime));
                continue;
            }
            throw error;
        }
    }
    throw new Error("Max retries exceeded");
};

/**
 * Analyzes a group of images using Gemini 2.5 Flash to pick the best ones.
 */
export const analyzeImageGroup = async (
  images: ProcessedImage[],
  maxSelection: number = 3,
  customPrompt?: string
): Promise<AnalysisResult> => {
  // 1. Immediate validation of API Key
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    return { 
        bestIndices: [0], 
        selectionReason: "⚠️ LỖI CẤU HÌNH: Không tìm thấy API Key.", 
        rejectionReason: "Vui lòng kiểm tra file .env hoặc cấu hình dự án.",
        title: "Thiếu API Key",
        tags: ["Lỗi"]
    };
  }

  // Initialize client
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  if (images.length === 0) {
    return { bestIndices: [], selectionReason: '', rejectionReason: '', title: 'Nhóm trống', tags: [] };
  }

  try {
    // Prepare images for the payload
    // Use resizeImageToBase64 to prevent payload from being too large
    const imageParts = await Promise.all(images.map(async (img) => ({
      inlineData: {
        mimeType: 'image/jpeg', // Resized images are always JPEG
        data: await resizeImageToBase64(img.file),
      }
    })));

    // Create a mapping of Number to Filename for the AI
    // Format: "1. filename.jpg"
    const fileListText = images.map((img, idx) => `${idx + 1}. ${img.file.name}`).join('\n');

    let prompt = "";

    // LOGIC CHO NHÓM 1 ẢNH (Phân tích chi tiết thay vì chọn lọc)
    if (images.length === 1) {
        const defaultInstruction = `
        Act as a strict but helpful professional photography mentor.
        Analyze this single image to help the photographer improve.
        Language: VIETNAMESE (Tiếng Việt).

        1. 'bestIndices': Must be [0].
        2. 'selectionReason': TECHNICAL STRENGTHS (Điểm mạnh kỹ thuật). Analyze composition, lighting, focus, and color. What works well?
        3. 'rejectionReason': CONSTRUCTIVE CRITICISM & IMPROVEMENT (Góp ý cải thiện). What is lacking? How could it be shot better next time? (e.g. "Framing is too tight", "Background is distracting").
        4. 'title': A creative, short Vietnamese title (3-6 words).
        5. 'tags': 3-5 descriptive Vietnamese tags.
        6. 'imageInsights': Specific, actionable EDITING instructions to fix the identified issues (e.g. "Increase exposure 0.5EV", "Crop 4:5 ratio").
        `;
        
        prompt = `
        ${customPrompt ? `Instruction: ${customPrompt}\nAnalyze this single image.` : defaultInstruction}
        
        Filename: ${fileListText}
        
        Return JSON only.
        `;

    } else {
        // LOGIC CHO NHÓM NHIỀU ẢNH (Chọn lọc)
        
        // Dynamic selection count logic
        let targetSelectionCount = maxSelection;
        if (images.length >= 3 && images.length <= 5) {
            targetSelectionCount = 2;
        }
        if (images.length > 10) {
            targetSelectionCount = Math.ceil(images.length * 0.5);
        }
        const finalCount = Math.min(targetSelectionCount, images.length);

        const defaultInstruction = `
        Act as a world-class professional photographer and photo editor.
        1. Identify the best ${finalCount} images. CRITICAL: Prioritize sharp focus on eyes, natural lighting, and emotional impact.
        2. Provide a detailed technical analysis in VIETNAMESE (Tiếng Việt) separated into two parts:
           - WHY SELECTED: Analyze specific visual elements like sharpness, lighting, composition.
           - WHY REJECTED: Point out specific technical flaws like motion blur, closed eyes, bad framing.
        3. Provide a SHORT title (3-6 words) in VIETNAMESE summarizing the content.
        4. CLASSIFY the group with 3-5 descriptive TAGS in VIETNAMESE.
        5. 'imageInsights': For the SELECTED best images, provide specific, actionable TECHNICAL EDITING suggestions in VIETNAMESE (e.g. "Giảm highlight", "Tăng contrast", "Khử ám xanh").
        `;

        prompt = `
        ${customPrompt ? `Instruction: ${customPrompt}\nSelect top ${finalCount} images.` : defaultInstruction}

        Here is the list of images (Number. Filename):
        ${fileListText}

        Return JSON only.
        `;
    }

    const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [...imageParts, { text: prompt }]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bestIndices: {
              type: Type.ARRAY,
              items: { type: Type.INTEGER },
              description: "Array of indices (0-based) representing the best images."
            },
            selectionReason: {
              type: Type.STRING,
              description: "Detailed technical Vietnamese analysis explaining strengths/selection."
            },
            rejectionReason: {
              type: Type.STRING,
              description: "Detailed technical Vietnamese analysis explaining weaknesses/rejection."
            },
            title: {
              type: Type.STRING,
              description: "Short Vietnamese title describing the group content."
            },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of 3-5 classification tags (categories) in Vietnamese."
            },
            imageInsights: {
                type: Type.ARRAY,
                description: "Editing suggestions for specific images",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        index: { type: Type.INTEGER, description: "Index of the image (0-based)" },
                        suggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of short technical editing suggestions in Vietnamese" }
                    }
                }
            }
          }
        }
      }
    }));

    if (response.text) {
      const result = JSON.parse(response.text) as AnalysisResult;
      // Ensure title exists if model omits it
      if (!result.title) result.title = "Nhóm ảnh đã lọc";
      if (!result.tags) result.tags = ["Chưa phân loại"];
      if (!result.rejectionReason) result.rejectionReason = "Các ảnh còn lại không đạt tiêu chuẩn kỹ thuật.";
      return result;
    } else {
      throw new Error('No response from AI');
    }

  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    
    let userMessage = "Lỗi phân tích AI.";
    let title = "Lỗi phân tích";
    const errorString = error.toString().toLowerCase();

    // Map common Gemini/HTTP errors to user-friendly Vietnamese messages
    if (errorString.includes('401') || errorString.includes('unauthenticated')) {
        userMessage = "⚠️ LỖI XÁC THỰC: API Key không hợp lệ hoặc hết hạn.";
        title = "Sai API Key";
    } else if (errorString.includes('429') || errorString.includes('quota') || errorString.includes('resource_exhausted')) {
        userMessage = "⚠️ QUÁ TẢI: Đã vượt quá giới hạn request (Quota). Vui lòng thử lại sau ít phút.";
        title = "Hết Quota";
    } else if (errorString.includes('503') || errorString.includes('overloaded')) {
        userMessage = "⚠️ SERVER BẬN: Máy chủ Google đang quá tải.";
        title = "Server Bận";
    } else if (errorString.includes('invalid string length')) {
        userMessage = "⚠️ LỖI DỮ LIỆU: Ảnh quá lớn hoặc quá nhiều ảnh.";
        title = "Lỗi Dữ Liệu";
    }

    // Fallback
    return { 
        bestIndices: [0], 
        selectionReason: userMessage, 
        rejectionReason: "Không thể phân tích do lỗi hệ thống hoặc quá tải.",
        title: title,
        tags: ["Lỗi"]
    };
  }
};

interface SubGroupDefinition {
    indices: number[];
}

interface RefineResult {
    subGroups: SubGroupDefinition[];
}

/**
 * Asks Gemini to check if the group should be split into smaller subgroups based on content.
 */
export const refineImageGroup = async (images: ProcessedImage[]): Promise<number[][]> => {
    if (!import.meta.env.VITE_GEMINI_API_KEY || images.length < 2) return [images.map((_, i) => i)];

    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

    try {
        const imageParts = await Promise.all(images.map(async (img) => ({
            inlineData: {
                mimeType: 'image/jpeg',
                data: await resizeImageToBase64(img.file),
            }
        })));

        const prompt = `
        You are an intelligent photo organizer helper.
        Look at these ${images.length} images sequentially.
        
        Task: Analyze the CONTENT and SEMANTICS of the images to correct any grouping errors.
        The current grouping was done by timestamp, which might be wrong.
        
        Strictly SPLIT the group into sub-groups if:
        1. The **Subject** changes completely (e.g., from a person to a building).
        2. The **Location/Background** changes drastically.
        3. The **Orientation** changes consistently (e.g. a batch of verticals vs horizontals).
        4. The **Event** changes (e.g., from ceremony to reception).

        If they are all variations of the same scene/shoot, keep them as ONE group.

        Return a JSON object with 'subGroups', where each subGroup has a list of 'indices'.
        Every index from 0 to ${images.length - 1} MUST be included exactly once.
        `;

        const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [...imageParts, { text: prompt }] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        subGroups: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    indices: {
                                        type: Type.ARRAY,
                                        items: { type: Type.INTEGER }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }));

        if (response.text) {
            const result = JSON.parse(response.text) as RefineResult;
            // Validate: Extract indices arrays
            return result.subGroups.map(g => g.indices);
        }
        
        return [images.map((_, i) => i)]; // Fallback: no split
    } catch (error) {
        console.error("Refine Error:", error);
        return [images.map((_, i) => i)]; // Fallback on error
    }
};

interface MergeResult {
    clusters: number[][]; // Array of clusters, where each cluster is an array of indices from the input list
}

/**
 * Asks Gemini to identify which small groups belong together.
 * Input: Representative images from different small groups.
 * Output: Arrays of indices indicating which input images (groups) should be merged.
 */
export const mergeSimilarGroups = async (representativeImages: ProcessedImage[]): Promise<number[][]> => {
    if (!import.meta.env.VITE_GEMINI_API_KEY || representativeImages.length < 2) return [];

    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

    try {
        const imageParts = await Promise.all(representativeImages.map(async (img) => ({
            inlineData: {
                mimeType: 'image/jpeg',
                data: await resizeImageToBase64(img.file),
            }
        })));

        const prompt = `
        You are a smart photo organizer.
        Here are representative images from ${representativeImages.length} different small photo groups.
        Many of these groups are likely fragmented parts of the same event or scene and should be merged.

        Task: Group these indices together if the images appear to be from the:
        1. Same distinct scene or location.
        2. Same specific subject (person/object) in the same outfit/setting.
        3. Same event moment.

        Return a JSON object with 'clusters'. Each cluster is a list of indices (0 to ${representativeImages.length - 1}).
        Only include clusters with 2 or more indices.
        Groups that should remain separate do not need to be included in the output.
        `;

        const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [...imageParts, { text: prompt }] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        clusters: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.ARRAY,
                                items: { type: Type.INTEGER }
                            }
                        }
                    }
                }
            }
        }));

        if (response.text) {
            const result = JSON.parse(response.text) as MergeResult;
            return result.clusters;
        }
        
        return [];
    } catch (error) {
        console.error("Smart Merge Error:", error);
        return []; 
    }
};


interface DistributeResult {
    actions: ('PREV' | 'NEXT' | 'STAY')[];
}

/**
 * Analyzes specific images in a small group and decides if they should be moved to Previous or Next group.
 */
export const distributeImages = async (
    prevContext: ProcessedImage[],
    currentImages: ProcessedImage[],
    nextContext: ProcessedImage[]
): Promise<('PREV' | 'NEXT' | 'STAY')[]> => {
     if (!import.meta.env.VITE_GEMINI_API_KEY) return currentImages.map(() => 'STAY');

     const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
     
     // Limit context to conserve tokens/bandwidth (last 2 of prev, first 2 of next)
     const prevRefs = prevContext.slice(-2);
     const nextRefs = nextContext.slice(0, 2);

     try {
        const parts = [];
        
        // Add context images labeled
        for(let i=0; i<prevRefs.length; i++) {
            parts.push({ 
                inlineData: { mimeType: 'image/jpeg', data: await resizeImageToBase64(prevRefs[i].file) },
            });
            parts.push({ text: `[CONTEXT PREV GROUP]` });
        }

        for(let i=0; i<nextRefs.length; i++) {
             parts.push({ 
                inlineData: { mimeType: 'image/jpeg', data: await resizeImageToBase64(nextRefs[i].file) },
            });
            parts.push({ text: `[CONTEXT NEXT GROUP]` });
        }

        // Add images to evaluate
        for(let i=0; i<currentImages.length; i++) {
             parts.push({ 
                inlineData: { mimeType: 'image/jpeg', data: await resizeImageToBase64(currentImages[i].file) },
            });
            parts.push({ text: `[TARGET IMAGE ${i}]` });
        }

        const prompt = `
        You are organizing a photo album. You have a "Previous Group" (Context Prev), a "Next Group" (Context Next), and a set of "Target Images" that are currently isolated in a small group between them.

        Task: For EACH "Target Image", decide where it belongs based on visual similarity (lighting, subject, background, event flow).
        
        Choices:
        - "PREV": If it looks like it belongs to the Previous Group.
        - "NEXT": If it looks like it belongs to the Next Group.
        - "STAY": If it is distinct from both and should remain in its own group.

        Return a JSON object with an 'actions' array containing exactly one string ("PREV", "NEXT", or "STAY") for each Target Image, in order.
        `;

        const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [...parts, { text: prompt }] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        actions: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING, enum: ['PREV', 'NEXT', 'STAY'] }
                        }
                    }
                }
            }
        }));

        if (response.text) {
             const result = JSON.parse(response.text) as DistributeResult;
             if (result.actions && result.actions.length === currentImages.length) {
                 return result.actions;
             }
        }
        
        return currentImages.map(() => 'STAY');

     } catch (e) {
         console.error("Distribute Error", e);
         // Return safe fallback so the app continues processing
         return currentImages.map(() => 'STAY');
     }
}

interface EditSuggestionResult {
    suggestions: string[];
    cssFilters: {
        brightness: number;
        contrast: number;
        saturation: number;
        warmth: number;
    }
}

/**
 * 1. GET SUGGESTIONS & CSS PREVIEW
 * Uses Gemini 2.5 Flash to analyze the image and return text suggestions + simulated CSS filters.
 */
export const getEditSuggestions = async (image: ProcessedImage): Promise<EditSuggestionResult> => {
    if (!import.meta.env.VITE_GEMINI_API_KEY) throw new Error("Missing API Key");
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

    const base64Data = await resizeImageToBase64(image.file);
    
    const prompt = `
    Act as a professional photo editor. Analyze this image.
    1. Suggest 3 specific editing actions (e.g., "Enhance shadows", "Reduce warmth"). Return as short Vietnamese strings.
    2. Suggest CSS filter values (0.0 to 2.0 range, default 1.0) to instantly improve it:
       - brightness (0.5 to 1.5)
       - contrast (0.5 to 1.5)
       - saturation (0.0 to 2.0)
       - warmth (For sepia, use 0.0 to 0.5. 0 is neutral)
    
    Return JSON.
    `;

    const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                { text: prompt }
            ]
        },
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                    cssFilters: {
                        type: Type.OBJECT,
                        properties: {
                            brightness: { type: Type.NUMBER },
                            contrast: { type: Type.NUMBER },
                            saturation: { type: Type.NUMBER },
                            warmth: { type: Type.NUMBER }
                        }
                    }
                }
            }
        }
    }));

    if (response.text) {
        return JSON.parse(response.text) as EditSuggestionResult;
    }
    throw new Error("No suggestions returned");
};


/**
 * 2. GENERATE ENHANCED IMAGE
 * Uses Gemini 2.5 Flash Image to generate a new, edited version of the image.
 * Added: Safety Settings and strict instructions to return image ONLY.
 */
export const generateEnhancedImage = async (image: ProcessedImage, specificInstructions?: string[]): Promise<string> => {
    if (!import.meta.env.VITE_GEMINI_API_KEY) throw new Error("Missing API Key");
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
    
    const base64Data = await resizeImageToBase64(image.file);

    let prompt = `
    [System: Image Processing]
    Input: An image.
    Task: Professional photo enhancement. Improve lighting, color balance, and detail.
    Output: A high-quality edited image ONLY. Do not output text.
    `;
    
    if (specificInstructions && specificInstructions.length > 0) {
        prompt = `
        [System: Image Processing]
        Instructions: ${specificInstructions.join(', ')}.
        Task: Enhance the photo based on the instructions.
        Output: The edited image ONLY. No text.
        `;
    }

    // Set permissible safety settings to avoid blocking standard photo editing
    const safetySettings = [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
    ];

    try {
        const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                    { text: prompt }
                ]
            },
            config: {
                // @ts-ignore - The SDK allows string values for threshold in practice
                safetySettings: safetySettings
            }
        }));

        const candidates = response.candidates;
        if (candidates && candidates[0] && candidates[0].content && candidates[0].content.parts) {
            for (const part of candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
             // Check if model returned text refusal instead of image
            if (candidates[0].content.parts[0]?.text) {
                 // Often the model returns a polite confirmation text INSTEAD of the image if it misinterpreted the "System" prompt.
                 // We throw a clear error here.
                 throw new Error(`AI returned text instead of image: "${candidates[0].content.parts[0].text.substring(0, 50)}..."`);
            }
        }
        
        throw new Error("No image generated by AI (Empty Response)");

    } catch (e: any) {
        // Fallback to Pro model is removed because it triggers 403 Permission Denied for many users
        throw new Error(`Failed to generate image: ${e.message}`);
    }
};

/**
 * 3. GENERATE IMAGE VARIATIONS
 * Uses Gemini 2.5 Flash Image to generate multiple unique edited versions (styles).
 * SEQUENTIAL EXECUTION to prevent API blocking.
 */
export const generateImageVariations = async (image: ProcessedImage): Promise<string[]> => {
    if (!import.meta.env.VITE_GEMINI_API_KEY) throw new Error("Missing API Key");
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
    const base64Data = await resizeImageToBase64(image.file);

    const styles = [
        "Cinematic lighting, movie scene look",
        "Vintage analog film photography",
        "Black and white fine art high contrast",
        "HDR Vibrant Landscape style"
    ];

    const safetySettings = [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
    ];

    const results: string[] = [];

    // Execute SEQUENTIALLY to avoid Rate Limits (429) for 4 simultaneous heavy requests
    for (const style of styles) {
        try {
            const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                        { text: `[System] Task: Apply style "${style}" to this image. Output: Image ONLY. No text.` }
                    ]
                },
                config: {
                    // @ts-ignore
                    safetySettings: safetySettings
                }
            }));

            const candidates = response.candidates;
            if (candidates && candidates[0] && candidates[0].content && candidates[0].content.parts) {
                for (const part of candidates[0].content.parts) {
                    if (part.inlineData && part.inlineData.data) {
                        results.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
                        break; // Found image part
                    }
                }
            }
            
            // INCREASED DELAY to prevent 429 Errors (5-8 seconds jitter)
            await new Promise(r => setTimeout(r, 5000 + Math.random() * 3000));

        } catch (e) {
            console.error(`Failed to generate style ${style}`, e);
            // Continue to next style even if one fails
        }
    }

    return results;
};


/**
 * 4. GENERATE IMPROVEMENT REPORT (NEW)
 * Compares the original image with the AI edited image and generates a text explanation.
 */
export const generateImprovementReport = async (originalBase64: string, editedBase64: string): Promise<string> => {
    if (!import.meta.env.VITE_GEMINI_API_KEY) return "Đã chỉnh sửa tự động.";
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

    // Clean base64 strings if they contain headers
    const cleanOriginal = originalBase64.split(',')[1] || originalBase64;
    const cleanEdited = editedBase64.split(',')[1] || editedBase64;

    const prompt = `
    You are a professional photo editor.
    Image 1 is the ORIGINAL. Image 2 is the EDITED version.
    
    Task: Explain briefly in VIETNAMESE (Tiếng Việt) what improvements were made.
    Focus on:
    - Lighting/Exposure (Sáng tối)
    - Color Balance (Cân bằng màu)
    - Detail/Sharpness (Chi tiết)
    - Style (Phong cách)

    Output format: A short paragraph (2-3 sentences). Start with "AI đã cải thiện: ..."
    `;

    try {
        const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { text: "ORIGINAL:" },
                    { inlineData: { mimeType: 'image/jpeg', data: cleanOriginal } },
                    { text: "EDITED:" },
                    { inlineData: { mimeType: 'image/jpeg', data: cleanEdited } },
                    { text: prompt }
                ]
            }
        }));

        return response.text?.trim() || "AI đã tự động tối ưu hóa ánh sáng và màu sắc.";
    } catch (e) {
        console.error("Report generation failed", e);
        return "AI đã tự động tối ưu hóa ánh sáng và màu sắc.";
    }
};
