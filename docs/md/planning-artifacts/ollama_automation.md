# 🤖 Chiến Lược Tự Động Hóa Ollama — Phase 2

> **Mục tiêu**: Người dùng chỉ cần cài Ollama + có sẵn 1 file `.gguf` → app tự làm hết.
> **Không cần**: CLI, terminal, Modelfile, hay bất kỳ kiến thức kỹ thuật nào.

---

## 1. Tổng Quan Flow Tự Động

```
┌─────────────────────────────────────────────────────┐
│ Người dùng mở PhotoCull                             │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│ BƯỚC 1: Auto-detect Ollama                          │
│ → Ping GET http://localhost:11434/api/tags           │
│ → Nếu THÀNH CÔNG → Ollama đang chạy ✅              │
│ → Nếu THẤT BẠI → Hiện hướng dẫn cài đặt 🔧         │
└───────────────────────┬─────────────────────────────┘
                        │ (Ollama sẵn sàng)
                        ▼
┌─────────────────────────────────────────────────────┐
│ BƯỚC 2: Kiểm tra model Vision có sẵn                │
│ → Lọc danh sách models từ /api/tags                 │
│ → Tìm model có tag "vision" hoặc tên quen           │
│   (llava, llama3.2-vision, minicpm-v, moondream,    │
│    qwen2.5-vl, granite-vision...)                   │
│ → Nếu CÓ → Dùng luôn, skip bước 3 ✅               │
│ → Nếu KHÔNG → Sang bước 3                           │
└───────────────────────┬─────────────────────────────┘
                        │ (Chưa có model)
                        ▼
┌─────────────────────────────────────────────────────┐
│ BƯỚC 3: Import file .gguf tự động                   │
│ → Hiện wizard: "Chọn file model .gguf từ máy"       │
│ → User browse file bằng <input type="file">         │
│ → App tự động:                                      │
│   3a. Hash SHA256 (streaming, không load hết vào RAM)│
│   3b. Upload blob → POST /api/blobs/sha256:{hash}   │
│   3c. Tạo model  → POST /api/create                 │
│ → Hiện progress bar % upload                        │
└───────────────────────┬─────────────────────────────┘
                        │ (Model đã sẵn sàng)
                        ▼
┌─────────────────────────────────────────────────────┐
│ BƯỚC 4: Test nhanh & Lưu config                     │
│ → Gửi 1 ảnh test → /api/chat (model vừa import)    │
│ → Nếu OK → Lưu model name vào localStorage         │
│ → Lần sau mở app, tự dùng model đã lưu              │
└─────────────────────────────────────────────────────┘
```

---

## 2. Chi Tiết Kỹ Thuật

### 2.1 Auto-Detect Ollama

```typescript
// services/ollamaService.ts

const OLLAMA_BASE = 'http://localhost:11434';

interface OllamaModel {
  name: string;
  size: number;
  details: { families: string[]; parameter_size: string };
}

// Kiểm tra Ollama có đang chạy không
export async function detectOllama(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { 
      signal: AbortSignal.timeout(3000) // Timeout 3 giây
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Lấy danh sách models đã cài
export async function listModels(): Promise<OllamaModel[]> {
  const res = await fetch(`${OLLAMA_BASE}/api/tags`);
  const data = await res.json();
  return data.models || [];
}

// Tìm model Vision đã có sẵn
const VISION_KEYWORDS = [
  'llava', 'vision', 'minicpm-v', 'moondream', 
  'qwen2.5-vl', 'qwen3-vl', 'granite-vision',
  'llama3.2-vision', 'phi-3.5-vision'
];

export async function findVisionModel(): Promise<string | null> {
  const models = await listModels();
  const vision = models.find(m => 
    VISION_KEYWORDS.some(kw => m.name.toLowerCase().includes(kw))
  );
  return vision?.name || null;
}
```

### 2.2 Import File .gguf — Streaming SHA256

**Vấn đề**: File .gguf có thể 5-30GB → KHÔNG thể `file.arrayBuffer()` (OOM).

**Giải pháp**: Dùng `ReadableStream` + `crypto.subtle.digest` theo chunks.

```typescript
// Hash SHA256 streaming — không load hết file vào RAM
async function streamingSHA256(
  file: File, 
  onProgress?: (percent: number) => void
): Promise<string> {
  const CHUNK_SIZE = 64 * 1024 * 1024; // 64MB mỗi chunk
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  
  // Sử dụng SubtleCrypto incremental digest
  // Lưu ý: SubtleCrypto không hỗ trợ streaming trực tiếp
  // → Dùng phương pháp manual với WebAssembly SHA256 hoặc js-sha256
  
  // Phương án thực tế: Dùng thư viện hash-wasm (rất nhanh, WASM-based)
  const { createSHA256 } = await import('hash-wasm');
  const hasher = await createSHA256();
  hasher.init();
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = await file.slice(start, end).arrayBuffer();
    hasher.update(new Uint8Array(chunk));
    
    onProgress?.((i + 1) / totalChunks * 100);
  }
  
  return hasher.digest('hex');
}
```

### 2.3 Upload Blob + Create Model

```typescript
// Upload file .gguf lên Ollama server
async function uploadGGUF(
  file: File, 
  digest: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  const url = `${OLLAMA_BASE}/api/blobs/sha256:${digest}`;
  
  // Kiểm tra blob đã tồn tại chưa (tránh upload lại)
  const check = await fetch(url, { method: 'HEAD' });
  if (check.ok) {
    console.log('Blob đã tồn tại, bỏ qua upload');
    return;
  }
  
  // Upload với XMLHttpRequest để có progress
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress?.(e.loaded / e.total * 100);
      }
    };
    
    xhr.onload = () => xhr.status < 400 ? resolve() : reject(xhr.statusText);
    xhr.onerror = () => reject('Upload failed');
    xhr.send(file);
  });
}

// Tạo model từ blob đã upload
async function createModelFromBlob(
  modelName: string, 
  fileName: string, 
  digest: string
): Promise<void> {
  const res = await fetch(`${OLLAMA_BASE}/api/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelName,
      files: { [fileName]: `sha256:${digest}` }
    })
  });
  
  // Đọc streaming response
  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response');
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = new TextDecoder().decode(value);
    console.log('Create progress:', text);
  }
}
```

### 2.4 Full Import Flow (1 function gọi tất cả)

```typescript
export async function autoImportModel(
  file: File,
  onStatus: (step: string, percent: number) => void
): Promise<string> {
  const modelName = `photocull-${file.name.replace('.gguf', '')}`;
  
  // Bước 1: Hash
  onStatus('Đang tính hash file...', 0);
  const digest = await streamingSHA256(file, (p) => {
    onStatus(`Đang tính hash: ${p.toFixed(0)}%`, p * 0.3); // 30% tổng
  });
  
  // Bước 2: Upload
  onStatus('Đang tải model lên Ollama...', 30);
  await uploadGGUF(file, digest, (p) => {
    onStatus(`Đang tải: ${p.toFixed(0)}%`, 30 + p * 0.5); // 50% tổng
  });
  
  // Bước 3: Create
  onStatus('Đang tạo model...', 80);
  await createModelFromBlob(modelName, file.name, digest);
  
  // Bước 4: Test
  onStatus('Đang kiểm tra model...', 95);
  // Gửi 1 prompt đơn giản để verify
  const testRes = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    body: JSON.stringify({
      model: modelName,
      messages: [{ role: 'user', content: 'Hello' }],
      stream: false
    })
  });
  
  if (!testRes.ok) throw new Error('Model test failed');
  
  // Lưu config
  localStorage.setItem('photocull_ollama_model', modelName);
  
  onStatus('Hoàn tất! ✅', 100);
  return modelName;
}
```

---

## 3. CORS — Vấn Đề Quan Trọng

**Browser sẽ block request đến `localhost:11434` vì CORS.**

### Giải pháp cho Windows:

```bash
# Cách 1: Set biến môi trường trước khi chạy Ollama
set OLLAMA_ORIGINS=*
ollama serve

# Cách 2: Set vĩnh viễn (System Environment Variable)
# → Tìm "Environment Variables" trong Windows Settings
# → Thêm: OLLAMA_ORIGINS = *
```

### PhotoCull sẽ tự hướng dẫn user:

Khi phát hiện CORS error, app sẽ hiện popup:

```
⚠️ Ollama đang chặn kết nối từ trình duyệt.
   
Để sửa, mở PowerShell (Admin) và chạy:
   
[System.Environment]::SetEnvironmentVariable(
  'OLLAMA_ORIGINS', '*', 'User'
)

Sau đó khởi động lại Ollama.
```

---

## 4. Phân Tích Ảnh Qua Ollama

```typescript
// Dùng model Vision đã cài để phân tích ảnh
export async function analyzeImageLocal(
  modelName: string,
  imageBase64: string,
  prompt: string
): Promise<string> {
  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelName,
      messages: [{
        role: 'user',
        content: prompt,
        images: [imageBase64] // Base64 KHÔNG có header data:...
      }],
      stream: false,
      options: {
        temperature: 0.3,    // Ít sáng tạo, chính xác hơn
        num_predict: 500,    // Giới hạn output tokens
        num_ctx: 2048        // Context window nhỏ = tiết kiệm RAM
      }
    })
  });

  const data = await res.json();
  return data.message?.content || '';
}
```

---

## 5. Vision Models Khuyến Nghị

| Model | RAM cần | Tốc độ | Chất lượng | Ghi chú |
|-------|---------|--------|-----------|---------|
| **moondream** (1.8B) | 2GB | ⚡⚡⚡⚡⚡ | ⭐⭐ | Siêu nhẹ, mô tả cơ bản |
| **llava:7b** | 5GB | ⚡⚡⚡ | ⭐⭐⭐ | Ổn định, phổ biến nhất |
| **minicpm-v** (8B) | 6GB | ⚡⚡⚡ | ⭐⭐⭐⭐ | OCR + phân tích rất tốt |
| **llama3.2-vision:11b** | 8GB | ⚡⚡ | ⭐⭐⭐⭐ | Meta, chất lượng cao |
| **qwen2.5-vl:7b** | 6GB | ⚡⚡⚡ | ⭐⭐⭐⭐⭐ | Tốt nhất hiện tại cho size |
| **qwen2.5-vl:72b** | 48GB | ⚡ | ⭐⭐⭐⭐⭐ | Cần GPU mạnh, cấp pro |

### Khuyến nghị cho máy có model 30GB:
- **8GB RAM**: `moondream` hoặc `llava:7b` (Q4 quantized)
- **16GB RAM**: `minicpm-v` hoặc `qwen2.5-vl:7b`
- **32GB RAM**: `llama3.2-vision:11b` hoặc model custom 30GB
- **64GB RAM**: Bất kỳ model nào, kể cả 72B

---

## 6. UI Wizard (Mockup)

```
┌──────────────────────────────────────────────┐
│  🤖 Cài đặt AI Local                        │
│                                              │
│  Trạng thái Ollama: 🟢 Đang chạy            │
│  Model hiện tại:    [Chưa có]               │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ 📂 Chọn file model (.gguf)            │  │
│  │                                        │  │
│  │  [  Chọn file từ máy tính...  ]       │  │
│  │                                        │  │
│  │  Hoặc tải model phổ biến:             │  │
│  │  • moondream (1.8GB) — Siêu nhẹ       │  │
│  │  • llava:7b (4.7GB) — Cân bằng        │  │
│  │  • minicpm-v (5.5GB) — Chất lượng cao │  │
│  │                        [Tải về]        │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ████████████░░░░░░░░░░  65%                │
│  Đang tải model lên Ollama...                │
│                                              │
│          [Hủy]        [Tự động cài đặt]     │
└──────────────────────────────────────────────┘
```

---

## 7. Kiến Trúc Provider (Gemini + Ollama + OpenRouter)

```typescript
// services/aiProvider.ts — Interface chung cho mọi provider

interface AIProvider {
  name: string;
  analyzeGroup(images: string[], prompt: string): Promise<AnalysisResult>;
  enhanceImage(image: string, instructions: string[]): Promise<string>;
  isAvailable(): Promise<boolean>;
}

class GeminiProvider implements AIProvider { /* ... hiện tại ... */ }
class OllamaProvider implements AIProvider { /* ... code mới ... */ }
class OpenRouterProvider implements AIProvider { /* ... tương lai ... */ }

// Auto-select provider tốt nhất
export async function getBestProvider(): Promise<AIProvider> {
  // Ưu tiên 1: Ollama local (miễn phí, nhanh)
  const ollama = new OllamaProvider();
  if (await ollama.isAvailable()) return ollama;
  
  // Ưu tiên 2: Gemini API (nếu có key)
  const gemini = new GeminiProvider();
  if (await gemini.isAvailable()) return gemini;
  
  // Ưu tiên 3: OpenRouter (free tier)
  return new OpenRouterProvider();
}
```
