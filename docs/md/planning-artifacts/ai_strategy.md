# Nghiên cứu Chiến lược AI cho PhotoCull AI

## 1. Hiện trạng: Phụ thuộc hoàn toàn vào Gemini Cloud

Hiện tại, toàn bộ AI trong project chạy qua **Gemini 2.5 Flash** (cloud API của Google). File `geminiService.ts` (726 dòng) có **6 chức năng AI**:

| # | Hàm | Model | Chức năng | Có cần Vision? |
|---|------|-------|-----------|----------------|
| 1 | `analyzeImageGroup()` | `gemini-2.5-flash` | Chọn ảnh tốt nhất trong nhóm | ✅ Có |
| 2 | `refineImageGroup()` | `gemini-2.5-flash` | Tách nhóm ảnh sai | ✅ Có |
| 3 | `mergeSimilarGroups()` | `gemini-2.5-flash` | Gộp các nhóm nhỏ lại | ✅ Có |
| 4 | `distributeImages()` | `gemini-2.5-flash` | Di chuyển ảnh giữa nhóm | ✅ Có |
| 5 | `getEditSuggestions()` | `gemini-2.5-flash` | Gợi ý chỉnh sửa ảnh | ✅ Có |
| 6 | `generateEnhancedImage()` | `gemini-2.5-flash-image` | Tạo ảnh đã chỉnh sửa | ✅ Có (Sinh ảnh) |
| 7 | `generateImageVariations()` | `gemini-2.5-flash-image` | Tạo 4 phiên bản style | ✅ Có (Sinh ảnh) |
| 8 | `generateImprovementReport()` | `gemini-2.5-flash` | So sánh ảnh gốc vs sửa | ✅ Có |

**Vấn đề**: Tất cả đều cần Vision (nhìn ảnh). Đây là thách thức lớn nhất khi chuyển sang AI local hoặc API free.

---

## 2. Phương án 1: AI Local (Ollama + Vision Models)

### 2.1. Cài đặt
```bash
# Cài Ollama
# Download từ https://ollama.com (Windows/Mac/Linux)

# Pull model vision
ollama pull llama3.2-vision    # 11B params - Cân bằng chất lượng/tốc độ
ollama pull moondream           # 1.6B params - Siêu nhẹ, GPU yếu vẫn chạy
ollama pull qwen2.5-vl          # Chất lượng cao nhất
ollama pull gemma-4-26b-a4b-it  # Google Gemma 4 - Rất mạnh, cần GPU tốt
```

### 2.2. API Endpoint
Ollama chạy REST API tại `http://localhost:11434`. Tương thích chuẩn OpenAI.

```javascript
// Ví dụ gọi API Ollama từ trình duyệt
const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    body: JSON.stringify({
        model: 'llama3.2-vision',
        messages: [{
            role: 'user',
            content: 'Phân tích ảnh này',
            images: [base64ImageData] // Base64 encoded
        }]
    })
});
```

### 2.3. Yêu cầu Phần cứng

| Model | VRAM cần | RAM cần | Tốc độ (1 ảnh) | Chất lượng |
|-------|----------|---------|-----------------|------------|
| `moondream` (1.6B) | 2-3 GB | 4 GB | 2-5 giây | ⭐⭐ Tạm đủ |
| `llama3.2-vision` (11B) | 8-10 GB | 12 GB | 5-15 giây | ⭐⭐⭐ Tốt |
| `qwen2.5-vl` (7B) | 6-8 GB | 10 GB | 5-10 giây | ⭐⭐⭐ Tốt |
| `gemma-4-26b-a4b-it` | 16+ GB | 24 GB | 10-30 giây | ⭐⭐⭐⭐ Rất tốt |

### 2.4. Ưu / Nhược điểm

**Ưu điểm**:
- ✅ Hoàn toàn miễn phí, không giới hạn request
- ✅ Dữ liệu ảnh không rời máy (bảo mật cao)
- ✅ Không phụ thuộc internet
- ✅ Không bị rate limit hay quota

**Nhược điểm**:
- ❌ Cần GPU tốt (tối thiểu 4-8GB VRAM)
- ❌ Chất lượng phân tích thấp hơn Gemini (đặc biệt với ảnh phức tạp)
- ❌ KHÔNG có khả năng sinh ảnh (Image Generation) → Hàm `generateEnhancedImage()` và `generateImageVariations()` **không thể thay thế bằng Ollama**
- ❌ Tốc độ chậm hơn trên phần cứng yếu

### 2.5. Những hàm có thể thay thế bằng Ollama

| Hàm | Thay thế được? | Ghi chú |
|-----|----------------|---------|
| `analyzeImageGroup()` | ✅ Có | Ollama vision model có thể phân tích và chọn ảnh |
| `refineImageGroup()` | ✅ Có | Nhận diện nội dung để tách nhóm |
| `mergeSimilarGroups()` | ✅ Có | So sánh nội dung ảnh |
| `distributeImages()` | ✅ Có | Phân loại ảnh vào nhóm |
| `getEditSuggestions()` | ✅ Có | Gợi ý chỉnh sửa (text output) |
| `generateEnhancedImage()` | ❌ KHÔNG | Ollama không sinh ảnh |
| `generateImageVariations()` | ❌ KHÔNG | Ollama không sinh ảnh |
| `generateImprovementReport()` | ✅ Có | So sánh 2 ảnh bằng text |

---

## 3. Phương án 2: API Free (OpenRouter, v.v.)

### 3.1. OpenRouter Free Vision Models (Tháng 5/2026)

| Model | ID trên OpenRouter | Context | Chất lượng |
|-------|-------------------|---------|------------|
| **Gemma 4 26B** | `google/gemma-4-26b-a4b-it:free` | 256K | ⭐⭐⭐⭐ Rất tốt |
| **Gemma 4 31B** | `google/gemma-4-31b-it:free` | 256K | ⭐⭐⭐⭐ Rất tốt |
| **Nemotron 3 Nano** | `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` | — | ⭐⭐⭐ Tốt |
| **Nemotron Nano 12B VL** | `nvidia/nemotron-nano-12b-2-vl:free` | — | ⭐⭐⭐ Tốt |
| **Free Router** | `openrouter/free` | Tự chọn | Tùy model |

### 3.2. Cách gọi API OpenRouter

```javascript
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        model: 'google/gemma-4-26b-a4b-it:free',
        messages: [{
            role: 'user',
            content: [
                { type: 'text', text: 'Phân tích nhóm ảnh này...' },
                { type: 'image_url', url: `data:image/jpeg;base64,${base64Data}` }
            ]
        }]
    })
});
```

### 3.3. Ưu / Nhược điểm

**Ưu điểm**:
- ✅ Miễn phí
- ✅ Không cần GPU mạnh trên máy
- ✅ Chất lượng tốt (Gemma 4 ngang ngửa Gemini Flash)
- ✅ Dễ tích hợp (chuẩn OpenAI API)

**Nhược điểm**:
- ❌ Có rate limit (giới hạn request/phút)
- ❌ Phụ thuộc internet
- ❌ Danh sách model free có thể thay đổi bất cứ lúc nào
- ❌ KHÔNG có model sinh ảnh free → Vẫn cần Gemini cho `generateEnhancedImage()`
- ❌ Ảnh gửi lên cloud (vấn đề bảo mật)

---

## 4. Các Nhà cung cấp API Free/Giá rẻ Khác

| Nhà cung cấp | Vision Free? | Ghi chú |
|---------------|-------------|---------|
| **Google AI Studio (Gemini)** | ✅ Free tier | Đang dùng. 15 RPM free |
| **OpenRouter** | ✅ Free models | Gemma 4, Nemotron |
| **Groq** | ✅ Free tier | Rất nhanh, hỗ trợ LLaVA |
| **Together AI** | ⚠️ Free trial | $25 credit free ban đầu |
| **Hugging Face Inference** | ✅ Free tier | Rate limit thấp |
| **Cloudflare Workers AI** | ✅ Free tier | LLaVA 1.5, giới hạn hàng ngày |

---

## 5. Chiến lược Đề xuất: Hybrid Multi-Provider

Thay vì chọn 1 provider duy nhất, thiết kế hệ thống **Hybrid** với fallback chain:

```
Ưu tiên 1: Ollama Local (nếu có GPU + đã cài Ollama)
    ↓ (nếu không có Ollama)
Ưu tiên 2: OpenRouter Free (Gemma 4 / Nemotron)
    ↓ (nếu rate limit)
Ưu tiên 3: Gemini Free Tier (API key của người dùng)
    ↓ (nếu hết quota)
Ưu tiên 4: Groq Free Tier
```

### 5.1. Cách triển khai

Tạo một **AI Provider Abstraction Layer** (lớp trừu tượng) để các hàm trong `geminiService.ts` không cần biết model nào đang chạy:

```typescript
// services/aiProvider.ts
interface AIProvider {
    analyzeImages(images: string[], prompt: string): Promise<string>;
    canGenerateImages(): boolean;
    generateImage?(image: string, prompt: string): Promise<string>;
}

class OllamaProvider implements AIProvider { ... }
class OpenRouterProvider implements AIProvider { ... }
class GeminiProvider implements AIProvider { ... }

// Auto-detect: thử Ollama trước, rồi fallback
const getProvider = async (): Promise<AIProvider> => {
    if (await isOllamaRunning()) return new OllamaProvider();
    if (OPENROUTER_KEY) return new OpenRouterProvider();
    if (GEMINI_KEY) return new GeminiProvider();
    throw new Error('No AI provider available');
};
```

### 5.2. Xử lý Sinh Ảnh (Image Generation)
Vì chỉ có Gemini hỗ trợ sinh ảnh (Flash Image), các tính năng `generateEnhancedImage()` và `generateImageVariations()` sẽ:
- **Nếu có Gemini key**: Dùng Gemini như hiện tại.
- **Nếu không có Gemini key**: Thay bằng **CSS Filter chỉnh sửa ảnh trên Canvas** (brightness, contrast, saturation, warmth) → Không cần AI, xử lý tức thì.

---

## 6. Kết luận & Khuyến nghị

| Tiêu chí | Ollama Local | OpenRouter Free | Gemini (hiện tại) |
|----------|-------------|-----------------|-------------------|
| Chi phí | $0 | $0 | $0 (free tier) |
| Cần GPU? | ✅ Cần | ❌ Không | ❌ Không |
| Cần Internet? | ❌ Không | ✅ Cần | ✅ Cần |
| Bảo mật ảnh | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ |
| Chất lượng | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Sinh ảnh | ❌ Không | ❌ Không | ✅ Có |
| Rate limit | Không giới hạn | Có giới hạn | Có giới hạn |

**Khuyến nghị**: Triển khai **Hybrid Multi-Provider** với giao diện cho phép người dùng chọn provider (Settings panel). Mặc định thử Ollama trước → OpenRouter → Gemini.
