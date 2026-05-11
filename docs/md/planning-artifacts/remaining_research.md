# 🧩 Các Vấn Đề Kỹ Thuật Còn Lại — Nghiên Cứu Bổ Sung

> Tài liệu này bao gồm 3 chủ đề chưa được nghiên cứu kỹ trong các tài liệu trước.

---

## 1. Web Worker Pool — Kiến Trúc Xử Lý Song Song

### Vấn đề hiện tại
- Hashing chạy trên **main thread** → freeze UI 30s+ với 10k ảnh
- `createImageBitmap` gọi tuần tự → không tận dụng multi-core CPU

### Giải pháp: Worker Pool Pattern

```
Main Thread                    Worker Pool (4 workers)
┌────────────┐                ┌──────────────┐
│ Task Queue │──dispatch───→  │ Worker #1    │ ← Hash ảnh 1
│            │                │ Worker #2    │ ← Hash ảnh 2
│ 10,000     │                │ Worker #3    │ ← Hash ảnh 3
│ images     │                │ Worker #4    │ ← Hash ảnh 4
│ pending    │◀──result────   │              │
└────────────┘                └──────────────┘
    │                              │
    ▼                              ▼
Progress Bar                  OffscreenCanvas
cập nhật liên tục             (không cần DOM)
```

### Code Blueprint

```typescript
// workers/imageHashWorker.ts
self.onmessage = async (e: MessageEvent) => {
  const { id, bitmap, width, height } = e.data;
  
  // Tạo OffscreenCanvas (không cần DOM)
  const canvas = new OffscreenCanvas(8, 8);
  const ctx = canvas.getContext('2d')!;
  
  // Resize ảnh xuống 8×8 cho pHash
  ctx.drawImage(bitmap, 0, 0, 8, 8);
  const pixels = ctx.getImageData(0, 0, 8, 8).data;
  
  // Tính average hash
  let total = 0;
  const grays: number[] = [];
  for (let i = 0; i < pixels.length; i += 4) {
    const gray = pixels[i] * 0.299 + pixels[i+1] * 0.587 + pixels[i+2] * 0.114;
    grays.push(gray);
    total += gray;
  }
  const avg = total / grays.length;
  const hash = grays.map(g => g >= avg ? '1' : '0').join('');
  
  // Tính Laplacian sharpness (trên canvas 128×128)
  const sharpCanvas = new OffscreenCanvas(128, 128);
  const sharpCtx = sharpCanvas.getContext('2d')!;
  sharpCtx.drawImage(bitmap, 0, 0, 128, 128);
  const sharpPixels = sharpCtx.getImageData(0, 0, 128, 128).data;
  const sharpness = calculateLaplacian(sharpPixels, 128, 128);
  
  // Giải phóng bitmap (QUAN TRỌNG!)
  bitmap.close();
  
  // Trả kết quả về main thread
  self.postMessage({ id, hash, sharpness });
};
```

```typescript
// services/workerPool.ts
class WorkerPool {
  private workers: Worker[];
  private queue: Array<{ resolve; reject; task }> = [];
  private idle: Worker[] = [];
  
  constructor(workerUrl: string, poolSize?: number) {
    const size = poolSize || navigator.hardwareConcurrency || 4;
    this.workers = Array.from({ length: size }, () => {
      const w = new Worker(workerUrl, { type: 'module' });
      this.idle.push(w);
      return w;
    });
  }
  
  async process(file: File): Promise<{ hash: string; sharpness: number }> {
    // Tạo ImageBitmap trên main thread (non-blocking)
    const bitmap = await createImageBitmap(file);
    
    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject, task: { bitmap } });
      this.dispatch();
    });
  }
  
  private dispatch() {
    while (this.idle.length > 0 && this.queue.length > 0) {
      const worker = this.idle.pop()!;
      const { resolve, reject, task } = this.queue.shift()!;
      
      worker.onmessage = (e) => {
        resolve(e.data);
        this.idle.push(worker); // Worker rảnh, nhận task mới
        this.dispatch();
      };
      worker.onerror = reject;
      
      // Transfer bitmap (zero-copy, không clone)
      worker.postMessage(task, [task.bitmap]);
    }
  }
  
  terminate() {
    this.workers.forEach(w => w.terminate());
  }
}
```

### Hiệu năng ước tính

| Metric | Hiện tại (Main Thread) | Với Worker Pool (4 cores) |
|--------|----------------------|--------------------------|
| 1,000 ảnh | ~8s (freeze UI) | ~2s (UI mượt) |
| 5,000 ảnh | ~40s (freeze) | ~10s (UI mượt) |
| 10,000 ảnh | ~80s (freeze) | ~20s (UI mượt) |
| CPU usage | 100% 1 core | 100% 4 cores |
| UI responsive | ❌ Đơ hoàn toàn | ✅ Smooth 60fps |

---

## 2. ObjectURL Lifecycle Management — Chống Rò Rỉ RAM

### Vấn đề hiện tại (Audit #19, #20, #21)
```
Tạo ObjectURL ────→ Lưu vào state ────→ Xóa ảnh/nhóm ────→ URL VẪN TỒN TẠI
                                                              ↓
                                                         RAM KHÔNG GIẢM
                                                         10k ảnh = ~5-10GB
```

### Giải pháp: Centralized URL Manager

```typescript
// services/urlManager.ts

class ObjectURLManager {
  private registry = new Map<string, string>(); // imageId → objectURL
  private refCount = new Map<string, number>();  // url → số component đang dùng
  
  // Tạo URL và đăng ký
  create(imageId: string, file: File): string {
    // Nếu đã có, trả về cái cũ (tránh tạo trùng)
    if (this.registry.has(imageId)) {
      return this.registry.get(imageId)!;
    }
    
    const url = URL.createObjectURL(file);
    this.registry.set(imageId, url);
    this.refCount.set(url, 1);
    return url;
  }
  
  // Component bắt đầu dùng URL
  retain(url: string) {
    const count = this.refCount.get(url) || 0;
    this.refCount.set(url, count + 1);
  }
  
  // Component ngừng dùng URL (unmount)
  release(imageId: string) {
    const url = this.registry.get(imageId);
    if (!url) return;
    
    const count = (this.refCount.get(url) || 1) - 1;
    if (count <= 0) {
      URL.revokeObjectURL(url);
      this.registry.delete(imageId);
      this.refCount.delete(url);
    } else {
      this.refCount.set(url, count);
    }
  }
  
  // Xóa tất cả (reset app / empty trash)
  revokeAll() {
    this.registry.forEach(url => URL.revokeObjectURL(url));
    this.registry.clear();
    this.refCount.clear();
  }
  
  // Debug: Xem đang giữ bao nhiêu URL
  get activeCount() { return this.registry.size; }
}

export const urlManager = new ObjectURLManager();
```

### Tích hợp vào hooks

```typescript
// useImageGroups.ts — Sửa handleEmptyTrash
const handleEmptyTrash = useCallback(() => {
  if (confirm("Xóa vĩnh viễn?")) {
    // REVOKE tất cả URL trong trash trước khi xóa
    trash.forEach(item => {
      if (item.type === 'image') {
        urlManager.release((item.data as ProcessedImage).id);
      } else {
        (item.data as ImageGroup).images.forEach(img => {
          urlManager.release(img.id);
        });
      }
    });
    setTrash([]);
  }
}, [trash]);

// handleDeleteImage — Sửa để revoke
const handleDeleteImage = useCallback((groupId, imageId) => {
  // ... code hiện tại ...
  // THÊM: urlManager.release(imageId);
}, []);
```

### Tác động RAM

| Hành động | Hiện tại | Sau khi sửa |
|-----------|---------|-------------|
| Xóa 1 ảnh 5MB | +5MB leak | 0 (giải phóng ngay) |
| Xóa 1 nhóm 20 ảnh | +100MB leak | 0 |
| Empty trash 500 ảnh | +2.5GB leak | 0 |
| Session 10k ảnh xóa 3k | ~15GB RAM | ~3.5GB RAM |

---

## 3. OpenRouter Free Tier — Provider Dự Phòng

### Thông tin chính

| Metric | Giá trị |
|--------|---------|
| **RPM (req/phút)** | 20 |
| **RPD (req/ngày)** | 50 (miễn phí), 1000 (nạp $10) |
| **Vision models miễn phí** | Gemma 4 31B, NVIDIA Nemotron 3 Nano |
| **API format** | OpenAI-compatible |
| **Base URL** | `https://openrouter.ai/api/v1` |
| **Auto-router** | `openrouter/free` — tự chọn model tốt nhất |

### Code Integration

```typescript
// services/openRouterProvider.ts

class OpenRouterProvider implements AIProvider {
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }
  
  async analyzeGroup(imagesBase64: string[], prompt: string) {
    const content = [
      { type: 'text', text: prompt },
      ...imagesBase64.map(img => ({
        type: 'image_url',
        image_url: { url: `data:image/jpeg;base64,${img}` }
      }))
    ];
    
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'PhotoCull AI'
      },
      body: JSON.stringify({
        model: 'openrouter/free', // Auto-route to best free model
        messages: [{ role: 'user', content }],
        response_format: { type: 'json_object' }
      })
    });
    
    const data = await res.json();
    return JSON.parse(data.choices[0].message.content);
  }
}
```

### So sánh 3 Providers

| Tiêu chí | Ollama (Local) | Gemini API | OpenRouter Free |
|----------|---------------|------------|-----------------|
| **Chi phí** | $0 | Free tier / Pay | $0 (50 req/ngày) |
| **Tốc độ** | ⚡⚡⚡ (LAN) | ⚡⚡ (Internet) | ⚡ (Internet) |
| **Chất lượng** | Tùy model | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Privacy** | ✅ 100% local | ❌ Cloud | ❌ Cloud |
| **Rate limit** | Không giới hạn | 15 RPM | 20 RPM |
| **Vision** | ✅ (llava, etc.) | ✅ (Flash) | ✅ (Gemma 4) |
| **Image Gen** | ❌ | ✅ (Flash Image) | ❌ |
| **Offline** | ✅ | ❌ | ❌ |

### Chiến lược Auto-Fallback

```
User yêu cầu phân tích ảnh
        │
        ▼
┌─── Ollama đang chạy? ───┐
│ YES                  NO  │
▼                      ▼   │
Dùng Ollama    ┌─ Gemini key? ─┐
(miễn phí,     │ YES       NO  │
 nhanh)        ▼            ▼  │
           Dùng Gemini  OpenRouter key?
           (chất lượng   │ YES      NO
            cao nhất)    ▼          ▼
                     Dùng OR    Hướng dẫn
                     (dự phòng) cài đặt
```

---

## 4. Component Decomposition Map — Tách Monolith

### App.tsx (796 dòng) → Tách thành:

```
App.tsx (796 dòng)
├── components/
│   ├── AppHeader.tsx         ← Toolbar, search, stats (~120 dòng)
│   ├── BatchActionBar.tsx    ← Batch analyze/enhance buttons (~80 dòng)
│   ├── ExportMenu.tsx        ← ZIP/JSON export dropdown (~60 dòng)
│   ├── GroupListView.tsx     ← Virtuoso list + itemContent (~100 dòng)
│   └── StatusBar.tsx         ← Processing status toast (~40 dòng)
├── hooks/
│   ├── useKeyboardShortcuts.ts  ← Hotkeys logic (~30 dòng)
│   └── useImageNavigation.ts   ← Next/Prev image logic (~50 dòng)
└── App.tsx                   ← Chỉ còn ~200 dòng (composition only)
```

### ImageModal.tsx (873 dòng) → Tách thành:

```
ImageModal.tsx (873 dòng)
├── components/
│   ├── ImageViewer.tsx       ← Zoom/Pan/Display (~120 dòng)
│   ├── AIEditorPanel.tsx     ← Suggestions + Filters (~200 dòng)
│   ├── GenerativePanel.tsx   ← Magic Fix + Variations (~150 dòng)
│   ├── SyncPanel.tsx         ← Đồng bộ chỉnh sửa (~120 dòng)
│   ├── VariationGrid.tsx     ← Grid hiển thị biến thể (~80 dòng)
│   └── ModalToolbar.tsx      ← Top controls + downloads (~80 dòng)
└── ImageModal.tsx            ← Chỉ còn ~120 dòng (layout + state)
```

---

## 5. Checklist Tổng Hợp Cho Session Code Tiếp Theo

### Phase 1: Sửa Bugs & Performance (Ưu tiên cao)
- [ ] Sửa `process.env.API_KEY` → `import.meta.env.VITE_API_KEY`
- [ ] Sort files trước khi nhóm (by name/lastModified)
- [ ] Thêm Stray Rescue pass cho ảnh lẻ
- [ ] Tạo Web Worker Pool cho hashing
- [ ] Implement ObjectURL Manager (revoke khi xóa/trash)
- [ ] Tách App.tsx thành 5+ components
- [ ] Tách ImageModal.tsx thành 6+ components
- [ ] Thêm safeguard cho while(true) batch loop
- [ ] Global API request queue

### Phase 2: Ollama Integration
- [ ] Tạo `ollamaService.ts` (detect, list, import, chat)
- [ ] Streaming SHA256 cho file lớn
- [ ] Upload blob + create model API
- [ ] UI Setup Wizard
- [ ] CORS auto-detection + hướng dẫn
- [ ] Tạo AIProvider interface
- [ ] Implement OllamaProvider
- [ ] Settings panel chọn provider

### Phase 3: OpenRouter + Polish
- [ ] Implement OpenRouterProvider
- [ ] Auto-fallback logic (Ollama → Gemini → OpenRouter)
- [ ] IndexedDB cache cho kết quả phân tích
- [ ] Laplacian sharpness score
- [ ] EXIF DateTimeOriginal parsing
