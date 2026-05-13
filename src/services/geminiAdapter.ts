import { GoogleGenAI } from '@google/genai';
import type { AnalyzeImageInput, AnalyzeImageResult } from '../types/ai.js';

/**
 * Security principle:
 * - API key is injected at call time and never persisted to local storage/IndexedDB.
 * - Remote AI analysis is explicit opt-in by caller.
 */
export class GeminiAdapter {
  async analyzeImage(input: AnalyzeImageInput): Promise<AnalyzeImageResult> {
    if (!input.apiKey) {
      throw new Error('Gemini API key is required for cloud analysis.');
    }

    const client = new GoogleGenAI({ apiKey: input.apiKey });
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `${input.prompt}\nReturn JSON with keys: tags, qualityScore(0-100), suggestion(keep|reject), rationale. Analyze image metadata: ${input.image.fileName}`
    });

    const raw = response.text?.trim() ?? '{}';
    const parsed = safeParse(raw);

    return {
      imageId: input.image.id,
      tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
      qualityScore: clampNumber(parsed.qualityScore, 0, 100, 50),
      suggestion: parsed.suggestion === 'reject' ? 'reject' : 'keep',
      rationale: typeof parsed.rationale === 'string' ? parsed.rationale : 'No rationale provided.',
      createdAt: Date.now()
    };
  }
}

function safeParse(jsonLike: string): Record<string, unknown> {
  try {
    return JSON.parse(jsonLike) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}
