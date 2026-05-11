# 🌐 OpenRouter Integration — Chiến Lược Chi Tiết

> **Vai trò**: Provider dự phòng thứ 3 khi Ollama (local) và Gemini (cloud) không khả dụng.
> **Ưu điểm**: 1 API key → truy cập 100+ models, bao gồm các model Vision miễn phí.

---

## 1. Tổng Quan OpenRouter

### OpenRouter là gì?
- **API Gateway thống nhất** — 1 endpoint, 1 key, 100+ models từ nhiều provider
- **Format OpenAI-compatible** — code giống hệt OpenAI SDK
- **Free tier** — một số model hoàn toàn miễn phí
- **Auto-router** — `openrouter/free` tự chọn model tốt nhất cho request

### Tại sao dùng cho PhotoCull?
1. **Backup khi Ollama chưa cài** — user mới chưa có Ollama vẫn dùng được
2. **Backup khi Gemini hết quota** — chuyển sang OpenRouter tự động
3. **Không cần cài phần mềm** — chỉ cần API key (đăng ký miễn phí)
4. **Vision models miễn phí** — phân tích ảnh 50 lần/ngày, 0đ

---

## 2. Thông Số Kỹ Thuật

### API Endpoint
```
POST https://openrouter.ai/api/v1/chat/completions
```

### Headers bắt buộc
```typescript
{
  'Authorization': 'Bearer sk-or-v1-xxx',   // API key
  'Content-Type': 'application/json',
  'HTTP-Referer': 'https://photocull.app',  // Tùy chọn, cho ranking
  'X-Title': 'PhotoCull AI'                 // Tùy chọn, cho ranking
}
```

### Rate Limits

| Tier | RPM | RPD | Ghi chú |
|------|-----|-----|---------|
| **Free (chưa nạp)** | 20 | 50 | Đủ cho 5-10 nhóm/ngày |
| **$10 credits** | 20 | 1,000 | Đủ cho batch 100+ nhóm |
| **Paid models** | Không giới hạn* | Không giới hạn* | *Phụ thuộc provider gốc |

### Kiểm tra key & remaining
```typescript
// GET https://openrouter.ai/api/v1/key
const checkKey = async (apiKey: string) => {
  const res = await fetch('https://openrouter.ai/api/v1/key', {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  const data = await res.json();
  // data.limit, data.usage, data.remaining
  return data;
};
```

### Rate Limit Headers trong response
```
X-RateLimit-Remaining: 18    ← Còn bao nhiêu request
X-RateLimit-Reset: 1718000000 ← Timestamp reset
Retry-After: 30               ← Chờ bao nhiêu giây (khi bị 429)
```

---

## 3. Vision Models Miễn Phí

### Cách tìm model miễn phí
```typescript
// Lấy danh sách tất cả models
const res = await fetch('https://openrouter.ai/api/v1/models');
const data = await res.json();

// Lọc models miễn phí + hỗ trợ vision
const freeVisionModels = data.data.filter(m => 
  m.pricing?.prompt === '0' && 
  m.architecture?.modality?.includes('image')
);
```

### Models phổ biến (có thể thay đổi)

| Model | Vision | Context | Ghi chú |
|-------|--------|---------|---------|
| `openrouter/free` | ✅ Auto | Auto | **Router tự chọn model tốt nhất** |
| `google/gemma-4-31b:free` | ✅ | 128k | Google Gemma 4, rất mạnh |
| `nvidia/nemotron-3-nano:free` | ✅ | 8k | Nhẹ, nhanh |
| `qwen/qwen-vl-*:free` | ✅ | 32k | Qwen VL, chất lượng cao |
| `deepseek/deepseek-r1:free` | ❌ | 128k | Reasoning, không vision |

> **Lưu ý**: Danh sách free models **thay đổi thường xuyên**. App nên tự query API để cập nhật.

---

## 4. Code Implementation Chi Tiết

### 4.1 OpenRouter Provider Class

```typescript
// services/openRouterProvider.ts

import { AnalysisResult, ProcessedImage } from '../types';
import { resizeImageToBase64 } from './imageUtils';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

interface OpenRouterConfig {
  apiKey: string;
  model?: string;         // Mặc định: 'openrouter/free'
  maxRetries?: number;
  siteUrl?: string;
  siteName?: string;
}

export class OpenRouterProvider {
  private config: OpenRouterConfig;
  
  constructor(config: OpenRouterConfig) {
    this.config = {
      model: 'openrouter/free',
      maxRetries: 3,
      siteUrl: window.location.origin,
      siteName: 'PhotoCull AI',
      ...config
    };
  }
  
  // Kiểm tra provider khả dụng
  async isAvailable(): Promise<boolean> {
    if (!this.config.apiKey) return false;
    try {
      const res = await fetch(`${OPENROUTER_BASE}/key`, {
        headers: { 'Authorization': `Bearer ${this.config.apiKey}` }
      });
      return res.ok;
    } catch {
      return false;
    }
  }
  
  // Lấy thông tin key (credits còn lại)
  async getKeyInfo(): Promise<{ remaining: number; limit: number }> {
    const res = await fetch(`${OPENROUTER_BASE}/key`, {
      headers: { 'Authorization': `Bearer ${this.config.apiKey}` }
    });
    return await res.json();
  }
  
  // Lấy danh sách models miễn phí có vision
  async listFreeVisionModels(): Promise<string[]> {
    const res = await fetch(`${OPENROUTER_BASE}/models`);
    const data = await res.json();
    return data.data
      .filter((m: any) => 
        m.pricing?.prompt === '0' && 
        (m.architecture?.modality?.includes('image') || 
         m.id.includes('vision') || m.id.includes('vl'))
      )
      .map((m: any) => m.id);
  }
  
  // === CORE: Gọi API ===
  private async callAPI(
    messages: any[], 
    jsonMode: boolean = false
  ): Promise<any> {
    const body: any = {
      model: this.config.model,
      messages,
      stream: false
    };
    
    if (jsonMode) {
      body.response_format = { type: 'json_object' };
    }
    
    let lastError: any;
    
    for (let attempt = 0; attempt < (this.config.maxRetries || 3); attempt++) {
      try {
        const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': this.config.siteUrl || '',
            'X-Title': this.config.siteName || ''
          },
          body: JSON.stringify(body)
        });
        
        // Xử lý Rate Limit
        if (res.status === 429) {
          const retryAfter = res.headers.get('Retry-After');
          const waitMs = retryAfter 
            ? parseInt(retryAfter) * 1000 
            : 2000 * Math.pow(2, attempt); // Exponential backoff
          
          console.warn(`⚠️ OpenRouter 429 — chờ ${waitMs/1000}s...`);
          await new Promise(r => setTimeout(r, waitMs));
          continue;
        }
        
        if (!res.ok) {
          throw new Error(`OpenRouter ${res.status}: ${res.statusText}`);
        }
        
        const data = await res.json();
        
        // Log remaining quota
        const remaining = res.headers.get('X-RateLimit-Remaining');
        if (remaining) {
          console.log(`📊 OpenRouter quota còn: ${remaining} requests`);
        }
        
        return data.choices[0].message.content;
        
      } catch (e) {
        lastError = e;
        if (attempt < (this.config.maxRetries || 3) - 1) {
          await new Promise(r => setTimeout(r, 2000 * Math.pow(2, attempt)));
        }
      }
    }
    
    throw lastError;
  }
  
  // === Phân tích nhóm ảnh ===
  async analyzeGroup(
    images: ProcessedImage[], 
    maxSelection: number = 3
  ): Promise<AnalysisResult> {
    // Chuẩn bị ảnh dạng base64
    const imageContents = await Promise.all(
      images.map(async (img) => ({
        type: 'image_url' as const,
        image_url: {
          url: `data:image/jpeg;base64,${await resizeImageToBase64(img.file)}`
        }
      }))
    );
    
    const fileList = images
      .map((img, i) => `${i}. ${img.file.name}`)
      .join('\n');
    
    const finalCount = Math.min(maxSelection, images.length);
    
    const prompt = images.length === 1 
      ? `Analyze this single photo. Return JSON with: bestIndices (must be [0]), selectionReason (strengths in Vietnamese), rejectionReason (improvements in Vietnamese), title (short Vietnamese), tags (3-5 Vietnamese tags), imageInsights (editing suggestions).`
      : `Select the best ${finalCount} images from ${images.length} photos. Return JSON with: bestIndices (0-based array), selectionReason (Vietnamese), rejectionReason (Vietnamese), title (short Vietnamese), tags (3-5 Vietnamese), imageInsights (editing suggestions for selected images).

Images:
${fileList}`;

    const messages = [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        ...imageContents
      ]
    }];
    
    try {
      const responseText = await this.callAPI(messages, true);
      const result = JSON.parse(responseText) as AnalysisResult;
      
      // Validate & defaults
      if (!result.title) result.title = 'Nhóm ảnh';
      if (!result.tags) result.tags = ['Chưa phân loại'];
      if (!result.bestIndices) result.bestIndices = [0];
      
      return result;
    } catch (e) {
      console.error('OpenRouter analyze error:', e);
      return {
        bestIndices: [0],
        selectionReason: '⚠️ Không thể phân tích qua OpenRouter.',
        rejectionReason: 'Vui lòng thử lại hoặc chuyển sang provider khác.',
        title: 'Lỗi phân tích',
        tags: ['Lỗi']
      };
    }
  }
  
  // === Phân loại nhóm (Refine) ===
  async refineGroup(images: ProcessedImage[]): Promise<number[][]> {
    if (images.length < 2) return [images.map((_, i) => i)];
    
    const imageContents = await Promise.all(
      images.map(async (img) => ({
        type: 'image_url' as const,
        image_url: {
          url: `data:image/jpeg;base64,${await resizeImageToBase64(img.file)}`
        }
      }))
    );
    
    const prompt = `Look at these ${images.length} images. Split into sub-groups if subjects/locations are very different. Return JSON: { "subGroups": [{ "indices": [0,1] }, { "indices": [2,3] }] }. Every index 0-${images.length - 1} must appear exactly once.`;
    
    const messages = [{
      role: 'user',
      content: [{ type: 'text', text: prompt }, ...imageContents]
    }];
    
    try {
      const text = await this.callAPI(messages, true);
      const result = JSON.parse(text);
      return result.subGroups.map((g: any) => g.indices);
    } catch {
      return [images.map((_, i) => i)];
    }
  }
  
  // === Gợi ý chỉnh sửa ===
  async getEditSuggestions(image: ProcessedImage): Promise<{
    suggestions: string[];
    cssFilters: { brightness: number; contrast: number; saturation: number; warmth: number };
  }> {
    const base64 = await resizeImageToBase64(image.file);
    
    const messages = [{
      role: 'user',
      content: [
        { type: 'text', text: 'Analyze this photo. Return JSON: { "suggestions": ["3 Vietnamese editing tips"], "cssFilters": { "brightness": 1.0, "contrast": 1.0, "saturation": 1.0, "warmth": 0.0 } }' },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }
      ]
    }];
    
    const text = await this.callAPI(messages, true);
    return JSON.parse(text);
  }
}
```

### 4.2 Tích hợp vào AIProvider Interface

```typescript
// services/aiProvider.ts

import { AnalysisResult, ProcessedImage } from '../types';
import { OpenRouterProvider } from './openRouterProvider';

export interface AIProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  analyzeGroup(images: ProcessedImage[], maxSelection?: number): Promise<AnalysisResult>;
  refineGroup(images: ProcessedImage[]): Promise<number[][]>;
  getEditSuggestions(image: ProcessedImage): Promise<any>;
}

// Wrapper để OpenRouterProvider implements AIProvider
export function createOpenRouterProvider(apiKey: string): AIProvider {
  const provider = new OpenRouterProvider({ apiKey });
  return {
    name: 'OpenRouter',
    isAvailable: () => provider.isAvailable(),
    analyzeGroup: (imgs, max) => provider.analyzeGroup(imgs, max),
    refineGroup: (imgs) => provider.refineGroup(imgs),
    getEditSuggestions: (img) => provider.getEditSuggestions(img)
  };
}
```

---

## 5. Xử Lý Lỗi Thông Minh

### Error Mapping

```typescript
function mapOpenRouterError(status: number, body: any): string {
  switch (status) {
    case 400: return 'Dữ liệu gửi không hợp lệ. Thử giảm số ảnh.';
    case 401: return 'API Key không hợp lệ. Kiểm tra lại trong Settings.';
    case 402: return 'Hết credits. Nạp thêm tại openrouter.ai/credits.';
    case 403: return 'Model này yêu cầu nạp credits.';
    case 408: return 'Request timeout. Thử lại với ít ảnh hơn.';
    case 429: return 'Quá nhiều request. Chờ 1 phút rồi thử lại.';
    case 502: return 'Model provider đang bận. Thử model khác.';
    case 503: return 'Hệ thống quá tải. Chờ vài phút.';
    default:  return `Lỗi không xác định (${status}).`;
  }
}
```

### Auto-Fallback khi bị 429

```typescript
// Nếu OpenRouter 429 → chuyển sang model khác
async function analyzeWithFallback(images: ProcessedImage[]) {
  const providers = [
    new OpenRouterProvider({ apiKey, model: 'openrouter/free' }),
    new OpenRouterProvider({ apiKey, model: 'google/gemma-4-31b:free' }),
    new OpenRouterProvider({ apiKey, model: 'nvidia/nemotron-3-nano:free' }),
  ];
  
  for (const provider of providers) {
    try {
      return await provider.analyzeGroup(images);
    } catch (e: any) {
      if (e.message?.includes('429')) {
        console.warn(`Model bận, thử model tiếp theo...`);
        continue;
      }
      throw e;
    }
  }
  
  throw new Error('Tất cả models đều bận. Vui lòng thử lại sau.');
}
```

---

## 6. UI Settings Panel

```
┌──────────────────────────────────────────────┐
│  ⚙️ Cài đặt AI Provider                     │
│                                              │
│  Provider hiện tại: [▼ OpenRouter        ]   │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ 🌐 OpenRouter                          │  │
│  │                                        │  │
│  │ API Key: [sk-or-v1-•••••••••••]  [👁]  │  │
│  │                                        │  │
│  │ Trạng thái: 🟢 Hoạt động               │  │
│  │ Credits:    $4.82 còn lại              │  │
│  │ Quota:      42/50 requests hôm nay     │  │
│  │                                        │  │
│  │ Model: [▼ openrouter/free (Auto)  ]    │  │
│  │                                        │  │
│  │ [Lấy key miễn phí tại openrouter.ai]   │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  Thứ tự ưu tiên:                            │
│  1. 🖥️ Ollama (Local)    — Miễn phí, riêng tư│
│  2. 🔑 Gemini API        — Chất lượng cao    │
│  3. 🌐 OpenRouter        — Dự phòng          │
│                                              │
│          [Lưu]          [Test kết nối]       │
└──────────────────────────────────────────────┘
```

---

## 7. So Sánh Chi Tiết 3 Providers

| Tính năng | Ollama | Gemini | OpenRouter |
|-----------|--------|--------|-----------|
| **Phân tích nhóm ảnh** | ✅ | ✅ | ✅ |
| **Refine/Split nhóm** | ✅ | ✅ | ✅ |
| **Smart Merge** | ✅ | ✅ | ✅ |
| **Gợi ý chỉnh sửa** | ✅ | ✅ | ✅ |
| **Magic Fix (tạo ảnh)** | ❌ | ✅ | ❌* |
| **Biến thể màu** | ❌ | ✅ | ❌* |
| **Báo cáo cải thiện** | ✅ | ✅ | ✅ |
| **JSON Schema strict** | ❌ | ✅ | ✅ |
| **Offline** | ✅ | ❌ | ❌ |
| **Chi phí** | $0 | Free/$$ | $0-$$ |

> *OpenRouter không có Image Generation model miễn phí. Magic Fix chỉ hoạt động với Gemini.

### Hạn chế cần biết
1. **Không có Image Generation** — chỉ phân tích, không tạo ảnh mới
2. **50 req/ngày free** — batch 100 nhóm sẽ hết quota
3. **Latency cao hơn** — qua 2 lớp proxy (OpenRouter → Provider)
4. **Model free thay đổi** — hôm nay có, mai có thể mất
