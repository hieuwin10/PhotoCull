# 🔍 FULL AUDIT — PhotoCull AI (100 Issues)

> Kết quả audit toàn bộ codebase sau khi đọc **tất cả 13 file** của project.
> Phân loại: 🔴 Critical | 🟡 Important | 🟢 Minor | 🔵 UX/Design

---

## A. THUẬT TOÁN NHÓM ẢNH (`imageUtils.ts`)

| # | Vấn đề | Mức độ | Dòng |
|---|--------|--------|------|
| 1 | Chain Comparison chỉ so ảnh liền kề — 2 ảnh giống nhưng cách xa KHÔNG BAO GIỜ được nhóm | 🔴 | 228-244 |
| 2 | File không sort trước khi nhóm — thứ tự từ browser là ngẫu nhiên | 🔴 | 163 |
| 3 | Threshold cứng 12/64, không tự điều chỉnh theo loại ảnh | 🟡 | 216 |
| 4 | Không dùng EXIF DateTimeOriginal để nhóm | 🟡 | — |
| 5 | Không phát hiện ảnh trùng lặp (duplicate detection) | 🟡 | — |
| 6 | pHash dùng Average Hash (aHash) — dễ bị nhiễu bởi gradient/ảnh panorama | 🟡 | 90-111 |
| 7 | Hash string dùng `'0'`/`'1'` — tốn 8x bộ nhớ so với BigInt/Uint8Array | 🟢 | 108 |
| 8 | `legacyGeneratePerceptualHash` — không revoke ObjectURL nếu reject() | 🟡 | 128 |
| 9 | Canvas element tạo mỗi lần hash nhưng không cleanup — GC phải tự dọn | 🟢 | 77-80 |
| 10 | `resizeImageToBase64` dùng `new Image()` trên main thread — block UI | 🟡 | 15-62 |
| 11 | Không có Web Worker cho hashing — 10k ảnh sẽ freeze browser 30s+ | 🔴 | 175-206 |
| 12 | BATCH_SIZE=50 nhưng `Promise.all` vẫn có thể OOM với 50 bitmap đồng thời | 🟡 | 172 |
| 13 | `setTimeout(resolve, 0)` yield — nên dùng `requestIdleCallback` hoặc `scheduler.yield()` | 🟢 | 205 |
| 14 | Không có Laplacian sharpness score — không thể pre-select ảnh nét nhất | 🟡 | — |

---

## B. QUẢN LÝ NHÓM (`useImageGroups.ts`)

| # | Vấn đề | Mức độ | Dòng |
|---|--------|--------|------|
| 15 | `handleMoveImage` KHÔNG kiểm tra nhóm rỗng sau khi di chuyển ảnh cuối | 🟡 | 42-71 |
| 16 | `handleMoveImage` không reset `bestImageIds`/`status` của nhóm đích | 🟢 | 65-68 |
| 17 | `handleMergeGroups` giữ `selectionReason` từ group1 — sai ngữ cảnh | 🟡 | 114-119 |
| 18 | Merge 2 nhóm `done` giữ status `done` — nhưng phân tích đã outdated | 🟡 | 118 |
| 19 | `handleDeleteImage` không revoke ObjectURL — memory leak | 🟡 | 160-196 |
| 20 | `handleDeleteGroup` không revoke ObjectURL cho tất cả ảnh trong nhóm | 🟡 | 198-217 |
| 21 | `handleEmptyTrash` không revoke ObjectURL — tất cả ảnh trong trash vẫn chiếm RAM | 🔴 | 278-282 |
| 22 | `handleSortGroups` dùng `file.lastModified` thay vì EXIF time | 🟢 | 141 |
| 23 | `handleSplitGroup` tạo nhóm mới với `status: 'pending'` nhưng giữ `bestImageIds` từ cũ — mâu thuẫn | 🟢 | 92-98 |
| 24 | `handleRestoreFromTrash` tìm nhóm "Đã khôi phục" bằng title string — fragile | 🟢 | 251 |
| 25 | Không có Undo/Redo cho các thao tác nhóm | 🟢 | — |
| 26 | `groupsRef` sync bằng `useEffect` — có thể stale trong cùng render cycle | 🟡 | 10-11 |

---

## C. AI ANALYSIS (`useAIAnalysis.ts` — 836 dòng)

| # | Vấn đề | Mức độ | Dòng |
|---|--------|--------|------|
| 27 | File 836 dòng — quá lớn, nên tách thành modules riêng | 🟡 | — |
| 28 | `handleBatchAnalyzeAll` dùng `while(true)` loop — có thể infinite nếu logic sai | 🔴 | 182 |
| 29 | Auto-download ZIP sau batch analyze — không hỏi user, có thể gây bất ngờ | 🟡 | 286-294 |
| 30 | `handleSmartCleanup` gọi AI API cho MỖI ảnh lẻ tuần tự — cực chậm với 100+ ảnh lẻ | 🔴 | 518-546 |
| 31 | `handleSmartCleanup` không có progress bar chi tiết | 🟢 | 509 |
| 32 | `handleSmartMerge` chỉ dùng ảnh đầu tiên làm đại diện — có thể sai nếu ảnh đầu không tiêu biểu | 🟡 | 437 |
| 33 | `handleBatchRefine` dùng `CONCURRENCY = 1` — quá chậm, có thể tăng lên 2-3 | 🟢 | 370 |
| 34 | `handleBatchRefine` dùng `confirm()` — block main thread | 🟡 | 366 |
| 35 | `handleBatchEnhanceGroup` skip ảnh đã có `editedImageUrl` — không cho phép re-generate | 🟢 | 629-630 |
| 36 | `handleBatchEnhanceAll` tạo `interface Task` bên trong callback — anti-pattern, nên define ở module level | 🟢 | 728-731 |
| 37 | `shouldStopBatchRef` dùng chung cho cả analyze và enhance — nếu chạy cả 2 sẽ conflict | 🟡 | 18 |
| 38 | Không có rate limiter thông minh — chỉ dùng fixed delay 1-2s | 🟡 | 251, 664 |
| 39 | Error handling trong batch dùng string matching (`msg.includes('429')`) — fragile | 🟡 | 275 |
| 40 | `handleEnhanceSingleImage` gọi 3 API calls tuần tự (suggestions → generate → report) — chậm | 🟢 | 107-157 |

---

## D. GEMINI SERVICE (`geminiService.ts` — 726 dòng)

| # | Vấn đề | Mức độ | Dòng |
|---|--------|--------|------|
| 41 | `new GoogleGenAI()` được khởi tạo MỖI LẦN gọi function — nên dùng singleton | 🟡 | 60, 245, 324, 396, 490, 548, 621, 686 |
| 42 | `process.env.API_KEY` — không hoạt động trong Vite browser, phải dùng `import.meta.env` | 🔴 | 49 |
| 43 | `retryWithBackoff` max 6 retries × exponential delay = tối đa 64s chờ — quá lâu | 🟢 | 10 |
| 44 | Prompt dùng tiếng Việt lẫn tiếng Anh — AI có thể trả kết quả không nhất quán | 🟢 | 84-103 |
| 45 | `analyzeImageGroup` resize TẤT CẢ ảnh trước khi gửi — nếu nhóm 20 ảnh sẽ OOM | 🟡 | 69-74 |
| 46 | Không cache kết quả phân tích — reload page mất hết | 🟡 | — |
| 47 | `generateImageVariations` chạy 4 style tuần tự với 5-8s delay mỗi cái — tổng ~30s | 🟢 | 641-673 |
| 48 | Safety settings dùng `BLOCK_NONE` — có thể bị Google từ chối nếu policy thay đổi | 🟢 | 569-574 |
| 49 | `@ts-ignore` cho safety settings — type safety bị bỏ qua | 🟢 | 586-587 |
| 50 | `generateImprovementReport` gửi 2 ảnh full base64 — tốn tokens không cần thiết | 🟡 | 684-725 |
| 51 | Không có request queue/throttle global — nhiều feature chạy song song sẽ hit rate limit | 🔴 | — |
| 52 | Hardcoded model name `gemini-2.5-flash` — không cho phép user chọn model | 🟢 | 140 |
| 53 | Không có token counting — user không biết đang tốn bao nhiêu | 🟢 | — |
| 54 | Error fallback trả `bestIndices: [0]` — luôn chọn ảnh đầu tiên khi lỗi, gây hiểu nhầm | 🟡 | 221-222 |

---

## E. APP.TSX (796 dòng — MONOLITH)

| # | Vấn đề | Mức độ | Dòng |
|---|--------|--------|------|
| 55 | File 796 dòng — God Component, chứa cả state, logic, và 500+ dòng JSX | 🔴 | — |
| 56 | 20+ useState hooks trong 1 component | 🟡 | 20-89 |
| 57 | `handleNextImage`/`handlePrevImage` dùng `forEach` O(n×m) để tìm ảnh — chậm với 10k ảnh | 🟡 | 169-199 |
| 58 | `filteredGroups` useMemo phụ thuộc `groups` reference — re-compute mỗi lần bất kỳ group thay đổi | 🟡 | 108-145 |
| 59 | Search filter dùng `.toLowerCase()` mỗi render — nên debounce | 🟢 | 128 |
| 60 | `itemContent` callback phụ thuộc 12+ dependencies — re-create quá thường xuyên | 🟡 | 275 |
| 61 | `batchEndGroup` useEffect dependency array thiếu `batchEndGroup` — ESLint warning | 🟢 | 83 |
| 62 | Inline arrow functions trong JSX (`() => setZoomedImage(img)`) — tạo mới mỗi render | 🟢 | 263 |
| 63 | `handleClickOutside` dùng CSS class matching (`.popup-menu`) — fragile | 🟢 | 158 |
| 64 | "Dự án mới" button dùng `confirm()` — block main thread, bad UX | 🟢 | 429 |
| 65 | Export menu, Batch edit menu, Range edit menu — 3 dropdown states quản lý riêng lẻ | 🟢 | 57-69 |
| 66 | Stats tính lại mỗi render: `groups.filter(g => g.status === 'done')` — nên useMemo | 🟡 | 93-94 |
| 67 | `zoomedGroup` useMemo tìm bằng nested `.some()` — O(n×m) | 🟢 | 148-151 |
| 68 | Virtuoso `overscan: 500` — quá cao, render nhiều offscreen items không cần thiết | 🟢 | 704 |

---

## F. COMPONENTS

### PhotoGroup.tsx (554 dòng)

| # | Vấn đề | Mức độ | Dòng |
|---|--------|--------|------|
| 69 | File 554 dòng — nên tách header/toolbar/grid thành sub-components | 🟡 | — |
| 70 | `arePropsEqual` memo function — good, nhưng thiếu check cho `textSize` và `searchQuery` thay đổi | 🟢 | (memo) |
| 71 | Inline `onMoveImage` closure tạo callback mới mỗi render cho mỗi PhotoCard | 🟢 | — |
| 72 | Grid layout cứng `grid-cols-3 md:grid-cols-4 lg:grid-cols-5` — không responsive cho ultra-wide | 🟢 | — |

### PhotoCard.tsx (194 dòng)

| # | Vấn đề | Mức độ | Dòng |
|---|--------|--------|------|
| 73 | `memo` không có custom comparator — re-render khi parent re-render nếu bất kỳ prop thay đổi | 🟢 | 22 |
| 74 | `img.thumbnailUrl || img.previewUrl` — cả 2 đều là cùng 1 ObjectURL, logic thừa | 🟢 | 64 |
| 75 | File size hiển thị MB nhưng không format cho ảnh < 1MB (hiện "0.0MB") | 🟢 | 189 |
| 76 | `alt="thumbnail"` — accessibility kém, nên dùng filename | 🟢 | 65 |
| 77 | `animate-pulse` trên AI badge chạy vĩnh viễn — tốn CPU với nhiều ảnh | 🟢 | 180 |

### ImageModal.tsx (873 dòng)

| # | Vấn đề | Mức độ | Dòng |
|---|--------|--------|------|
| 78 | File 873 dòng — LỚN NHẤT trong project, God Component | 🔴 | — |
| 79 | Auto-fetch suggestions khi mở editor (`useEffect`) — gọi API không hỏi user | 🟡 | 184-188 |
| 80 | `handleGetSuggestions` gọi trong useEffect nhưng không check unmount — potential memory leak | 🟡 | 184-188 |
| 81 | Zoom drag logic tự implement — nên dùng library (react-zoom-pan-pinch) | 🟢 | 137-156 |
| 82 | Keyboard handler re-register mỗi khi `hasNext`/`hasPrev` thay đổi | 🟢 | 114-125 |
| 83 | `handleFilterChange` gọi `onUpdateImage` mỗi slider change — quá nhiều state updates | 🟡 | 200-206 |
| 84 | `JSON.stringify` so sánh filters — nên dùng shallow compare | 🟢 | 345 |
| 85 | Modal click handler dùng `e.stopPropagation()` chained — complex event flow | 🟢 | 780 |
| 86 | Download button tạo `<a>` element runtime thay vì dùng sẵn trong DOM | 🟢 | 432-438 |

### DropZone.tsx (53 dòng)

| # | Vấn đề | Mức độ | Dòng |
|---|--------|--------|------|
| 87 | Không filter file type khi drag-drop — chấp nhận mọi file kể cả non-image | 🟡 | 12-14 |
| 88 | Không hiển thị drag-over visual feedback (highlight border) | 🟢 | 28-32 |
| 89 | Text cứng "tối đa 1000 ảnh" — nhưng code không enforce limit | 🟡 | 38 |
| 90 | Không hỗ trợ folder drop (chỉ flat files) | 🟢 | — |

### TrashModal.tsx (115 dòng)

| # | Vấn đề | Mức độ | Dòng |
|---|--------|--------|------|
| 91 | Trash ảnh hiển thị `thumbnailUrl` đã bị revoke (nếu fix #19) — sẽ broken | 🟡 | 54-56 |
| 92 | Không có phân trang — trash 1000 items sẽ render all | 🟢 | 50 |
| 93 | Không có chức năng xóa từng item trong trash | 🟢 | — |

### InfoModal.tsx (142 dòng)

| # | Vấn đề | Mức độ | Dòng |
|---|--------|--------|------|
| 94 | Hardcoded quota numbers (RPM ~15) — có thể outdated | 🟢 | 85-89 |
| 95 | Không hiển thị API key status (valid/invalid/missing) | 🟢 | — |

---

## G. PROJECT MANAGER (`useProjectManager.ts` — 700 dòng)

| # | Vấn đề | Mức độ | Dòng |
|---|--------|--------|------|
| 96 | File 700 dòng — quá lớn, nên tách save/load/serialize | 🟡 | — |
| 97 | `dirHandleRef` typed `any` — mất type safety cho File System Access API | 🟢 | 23 |
| 98 | JSON project file lưu base64 AI images — file JSON có thể > 100MB | 🔴 | 44-46 |
| 99 | Không validate project file version khi load — breaking changes silent | 🟡 | — |

---

## H. TYPES & CONFIG

| # | Vấn đề | Mức độ | Dòng |
|---|--------|--------|------|
| 100 | `ProcessedImage.isBest` field tồn tại nhưng KHÔNG BAO GIỜ được set — dead code | 🟢 | types.ts:8 |
| 101 | `ProcessedImage.score` field tồn tại nhưng KHÔNG BAO GIỜ được set — dead code | 🟢 | types.ts:9 |
| 102 | `ProcessedImage.reason` field — trùng chức năng với `selectionReason` trên group | 🟢 | types.ts:10 |

---

## TỔNG KẾT

| Mức độ | Số lượng | Mô tả |
|--------|----------|-------|
| 🔴 Critical | **9** | Bugs gây crash, memory leak nghiêm trọng, logic sai |
| 🟡 Important | **34** | Performance kém, logic không tối ưu, thiếu tính năng quan trọng |
| 🟢 Minor | **59** | Code smell, UX nhỏ, dead code, best practices |
| **Tổng** | **102** | |

---

## TOP 10 ƯU TIÊN SỬA NGAY

1. **#42** `process.env.API_KEY` không hoạt động trong Vite → dùng `import.meta.env`
2. **#1** Chain Comparison → thêm Stray Rescue pass
3. **#2** Sort files trước khi nhóm
4. **#11** Web Worker cho hashing → tránh freeze UI
5. **#55** Tách App.tsx monolith → components nhỏ
6. **#78** Tách ImageModal.tsx 873 dòng
7. **#21** Revoke ObjectURL khi empty trash
8. **#51** Global request queue cho API calls
9. **#98** Không lưu base64 trong JSON → lưu file riêng
10. **#28** `while(true)` loop cần safeguard timeout
