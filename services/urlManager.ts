/**
 * ObjectURLManager
 * 
 * Quản lý vòng đời của ObjectURL để chống rò rỉ bộ nhớ (Memory Leak).
 * Đảm bảo mỗi Blob/File chỉ tạo 1 URL và được thu hồi (revoke) khi không còn sử dụng.
 */

class ObjectURLManager {
  // Bản đồ lưu trữ: imageId -> objectURL
  private registry = new Map<string, string>();
  
  // Đếm số lượng tham chiếu: url -> số lượng component đang dùng
  private refCount = new Map<string, number>();

  /**
   * Tạo hoặc lấy ObjectURL cho một ảnh
   * @param imageId ID duy nhất của ảnh
   * @param file Đối tượng File hoặc Blob
   */
  create(imageId: string, file: File | Blob): string {
    // Nếu đã tạo URL cho ảnh này rồi, trả về luôn và tăng refCount
    if (this.registry.has(imageId)) {
      const existingUrl = this.registry.get(imageId)!;
      const count = this.refCount.get(existingUrl) || 0;
      this.refCount.set(existingUrl, count + 1);
      return existingUrl;
    }

    // Nếu chưa có, tạo mới
    const url = URL.createObjectURL(file);
    this.registry.set(imageId, url);
    this.refCount.set(url, 1);
    
    console.debug(`[URLManager] Created URL for ${imageId}: ${url}`);
    return url;
  }

  /**
   * Tăng số lượng tham chiếu (khi có thêm component sử dụng URL này)
   */
  retain(url: string): void {
    if (this.refCount.has(url)) {
      const count = this.refCount.get(url)!;
      this.refCount.set(url, count + 1);
    }
  }

  /**
   * Giải phóng tham chiếu. Nếu không còn ai dùng sẽ revoke URL để giải phóng RAM.
   * @param imageId ID của ảnh cần giải phóng
   */
  release(imageId: string): void {
    const url = this.registry.get(imageId);
    if (!url) return;

    const count = (this.refCount.get(url) || 1) - 1;
    
    if (count <= 0) {
      // Không còn ai dùng, tiến hành thu hồi
      URL.revokeObjectURL(url);
      this.registry.delete(imageId);
      this.refCount.delete(url);
      console.debug(`[URLManager] Revoked URL for ${imageId}: ${url}`);
    } else {
      this.refCount.set(url, count);
    }
  }

  /**
   * Thu hồi TẤT CẢ URL (Dùng khi reset app hoặc dọn sạch sọt rác)
   */
  revokeAll(): void {
    this.registry.forEach((url, imageId) => {
      URL.revokeObjectURL(url);
      console.debug(`[URLManager] Emergency revoked URL for ${imageId}: ${url}`);
    });
    this.registry.clear();
    this.refCount.clear();
  }

  /**
   * Lấy số lượng URL đang hoạt động (để debug)
   */
  get activeCount(): number {
    return this.registry.size;
  }
}

// Export một instance duy nhất để dùng chung toàn app
export const urlManager = new ObjectURLManager();
