# Tối ưu RAM cho Model AI Nặng (~30GB) trên Ollama

## 1. Bài toán: Model 30GB trên Máy RAM Hạn chế

Khi bạn sử dụng các model vision cỡ lớn (ví dụ: `qwen2.5-vl:72b-q4`, `llama3.2-vision:90b-q4`, `gemma-4-26b-a4b-it`) có kích thước file ~30GB trên ổ cứng, câu hỏi đặt ra là: **Máy cần bao nhiêu RAM? Và làm sao để chạy được trên máy RAM thấp?**

### Quy tắc Ước tính RAM:
- **Model Q4_K_M** (lượng tử hóa 4-bit): Cần RAM ≈ **kích thước file model + 2-4GB overhead**.
- Model 30GB file → Cần tối thiểu **~32-34GB RAM tổng** (bao gồm cả hệ điều hành).
- Nếu máy chỉ có 16GB RAM → **BẮT BUỘC phải cấu hình thêm**.

---

## 2. Kỹ thuật #1: Memory Mapping (mmap) — Dùng Ổ Cứng Thay RAM

### Cách hoạt động
GGUF (định dạng file model của Ollama) sử dụng kỹ thuật **Memory Mapping (mmap)**. Thay vì load toàn bộ 30GB vào RAM, hệ điều hành **map file trên ổ cứng vào vùng nhớ ảo**. Chỉ những phần model đang cần xử lý mới được đọc vào RAM thật.

### Yêu cầu QUAN TRỌNG
- **Ổ cứng NVMe SSD là BẮT BUỘC**. Nếu dùng HDD, tốc độ đọc quá chậm (~100MB/s vs 3500MB/s trên NVMe) → model sẽ chạy cực kỳ chậm.
- Ổ cứng càng nhanh → model chạy càng mượt khi mmap.

### Kết quả
- Máy 16GB RAM vẫn có thể chạy model 30GB → Chỉ cần **ổ NVMe SSD đủ nhanh**.
- Tốc độ sẽ chậm hơn so với có đủ RAM, nhưng **vẫn hoạt động được**.

---

## 3. Kỹ thuật #2: Lượng tử hóa (Quantization) — Giảm Kích thước Model

### Bảng so sánh Quantization

| Quantization | Kích thước (model 70B) | Chất lượng | RAM cần |
|-------------|------------------------|------------|---------|
| FP16 (gốc) | ~130 GB | ⭐⭐⭐⭐⭐ 100% | 134+ GB |
| Q8_0 (8-bit) | ~68 GB | ⭐⭐⭐⭐ ~97% | 72+ GB |
| **Q5_K_M (5-bit)** | ~48 GB | ⭐⭐⭐⭐ ~95% | 52+ GB |
| **Q4_K_M (4-bit)** | ~40 GB | ⭐⭐⭐ ~92% | 44+ GB |
| Q3_K_M (3-bit) | ~30 GB | ⭐⭐ ~87% | 34+ GB |
| Q2_K (2-bit) | ~25 GB | ⭐ ~80% | 29+ GB |

### Khuyến nghị
- **Q4_K_M** là "sweet spot" — cân bằng tốt nhất giữa chất lượng và dung lượng.
- Với model 30GB file (đã Q4), bạn đang dùng model khá lớn (~70B params). Rất mạnh nhưng cần cấu hình kỹ.

---

## 4. Kỹ thuật #3: Cấu hình Windows cho Model Nặng

### 4.1. Tăng Virtual Memory (Pagefile)
Khi RAM vật lý không đủ, Windows sẽ swap sang pagefile trên ổ cứng. **Phải cấu hình pagefile đủ lớn**:

```
Cách cấu hình:
1. Mở System Properties → Advanced → Performance Settings → Advanced → Virtual Memory
2. Bỏ chọn "Automatically manage paging file size"
3. Chọn ổ NVMe SSD nhanh nhất
4. Set Initial Size = 32768 MB (32GB)
5. Set Maximum Size = 65536 MB (64GB)
6. Restart máy
```

**Quy tắc**: Pagefile nên = **2× kích thước model** trên ổ NVMe SSD.

### 4.2. Loại trừ Windows Defender
Windows Defender quét file model 30GB mỗi lần load → Cực chậm.

```
Cách cấu hình:
1. Windows Security → Virus & Threat Protection → Manage Settings
2. Exclusions → Add an exclusion → Folder
3. Thêm thư mục: %USERPROFILE%\.ollama\models
```

### 4.3. Power Plan → High Performance
```
1. Control Panel → Power Options
2. Chọn "High Performance"
3. Hoặc mở cmd: powercfg /setactive SCHEME_MIN
```

### 4.4. Đóng ứng dụng ngốn RAM
- Chrome (mỗi tab ~100-500MB RAM)
- VS Code (IDE → 500MB-1GB)
- Docker Desktop
- Trước khi chạy model nặng → **đóng hết các ứng dụng không cần thiết**.

---

## 5. Kỹ thuật #4: GPU Offloading — Chia tải giữa GPU và CPU

### Cách hoạt động
Ollama tự động offload **một phần model** lên GPU. Phần nào vừa VRAM thì chạy trên GPU (nhanh), phần còn lại chạy trên CPU/RAM (chậm hơn).

### Ví dụ với model 30GB:
- GPU có 8GB VRAM → ~25% model trên GPU, 75% trên CPU
- GPU có 12GB VRAM → ~40% model trên GPU, 60% trên CPU
- GPU có 24GB VRAM → ~80% model trên GPU, 20% trên CPU

### Kiểm tra bằng lệnh:
```bash
ollama ps
# Hiển thị model đang chạy, bao nhiêu layer trên GPU, bao nhiêu trên CPU
```

### Cấu hình số layer GPU:
```bash
# Đặt biến môi trường (Windows)
set OLLAMA_GPU_LAYERS=20
# Hoặc trong Ollama API:
# "options": { "num_gpu": 20 }
```

---

## 6. Kỹ thuật #5: Giảm Context Window — Tiết kiệm RAM Đáng kể

### Vấn đề
KV Cache (bộ nhớ context) ngốn RAM theo công thức:
```
KV Cache RAM ≈ 2 × num_layers × hidden_size × context_length × 2 bytes
```
Với model 70B, context 128K → KV Cache có thể ngốn **10-20GB RAM riêng**.

### Giải pháp
Giảm context window xuống mức vừa đủ cho bài toán phân tích ảnh (thường chỉ cần 2048-4096 tokens):

```bash
# Khi chạy Ollama
OLLAMA_NUM_CTX=4096 ollama run llama3.2-vision

# Hoặc trong API call
{
    "model": "llama3.2-vision",
    "options": {
        "num_ctx": 4096
    }
}
```

### Hiệu quả
Giảm context từ 128K → 4K có thể **tiết kiệm 5-15GB RAM**, sự khác biệt lớn nhất khi RAM hạn chế.

---

## 7. Kỹ thuật #6: Model Lifecycle Management — Load/Unload Thông minh

### Vấn đề
Model 30GB nằm trong RAM liên tục → Chiếm hết tài nguyên cho các ứng dụng khác.

### Giải pháp: Ollama Keep-Alive
```bash
# Model tự unload sau 5 phút không dùng (mặc định)
set OLLAMA_KEEP_ALIVE=5m

# Model unload ngay sau khi trả response
set OLLAMA_KEEP_ALIVE=0

# Hoặc trong API:
{
    "model": "llama3.2-vision",
    "keep_alive": "5m"
}
```

### Chiến lược cho PhotoCull AI
1. Khi người dùng bấm "Phân tích nhóm" → Load model.
2. Sau khi phân tích xong batch → Giữ model 5 phút chờ lệnh tiếp.
3. Nếu không có lệnh mới → Tự động unload → RAM trả lại cho trình duyệt và hệ thống.

---

## 8. Bảng Tóm tắt: Cấu hình Đề xuất theo RAM Máy

| RAM Máy | Model khuyến nghị | Quantization | Pagefile | Context | Ghi chú |
|---------|-------------------|-------------|----------|---------|---------|
| **8 GB** | `moondream` (1.6B) | Q4_K_M | 16 GB | 2048 | Chỉ model nhỏ |
| **16 GB** | `llama3.2-vision:11b` | Q4_K_M | 32 GB | 4096 | Đóng Chrome |
| **24 GB** | `qwen2.5-vl:32b` | Q4_K_M | 32 GB | 4096 | Thoải mái |
| **32 GB** | Model 30GB file | Q4_K_M | 32 GB | 8192 | Chạy tốt |
| **64 GB** | Model 30GB file | Q5_K_M | 16 GB | 16384 | Full speed |

---

## 9. Lưu ý: Vẫn Giữ Google Gemini API

Google API (Gemini) vẫn được giữ nguyên trong hệ thống vì:
- **Gemini là provider DUY NHẤT có khả năng sinh ảnh** (Image Generation).
- Chất lượng phân tích tốt nhất.
- Free tier (15 RPM) vẫn hữu ích cho các tác vụ nhẹ hoặc khi không có GPU.
- Kiến trúc Hybrid cho phép người dùng **tự chọn** provider trong Settings.
