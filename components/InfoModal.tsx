
import React from 'react';
import { X, Cpu, Zap, Activity, AlertTriangle, ShieldCheck } from 'lucide-react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-gray-950">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-900/30 rounded-lg border border-blue-500/30">
              <Cpu className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Thông tin AI & Giới hạn</h3>
              <p className="text-xs text-gray-500">Chi tiết về các mô hình Gemini đang sử dụng</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-800">
          
          {/* Section 1: Models */}
          <section>
            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" /> Mô hình đang sử dụng
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-purple-400 font-bold text-sm">Tạo & Sửa Ảnh (Magic Fix)</span>
                        <span className="bg-purple-900/50 text-purple-200 text-[10px] px-2 py-0.5 rounded border border-purple-700">Image Gen</span>
                    </div>
                    <div className="text-xl font-mono text-white mb-1">gemini-2.5-flash-image</div>
                    <p className="text-xs text-gray-400">Dùng cho tính năng Magic Fix, tạo biến thể màu và xử lý pixel.</p>
                </div>

                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-blue-400 font-bold text-sm">Phân tích & Vision</span>
                        <span className="bg-blue-900/50 text-blue-200 text-[10px] px-2 py-0.5 rounded border border-blue-700">Multimodal</span>
                    </div>
                    <div className="text-xl font-mono text-white mb-1">gemini-2.5-flash</div>
                    <p className="text-xs text-gray-400">Dùng để chấm điểm ảnh, phân loại, sắp xếp nhóm và gợi ý text.</p>
                </div>
            </div>
          </section>

          {/* Section 2: Quota & Limits */}
          <section>
            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Giới hạn & Quota
            </h4>
            
            <div className="bg-gray-950 rounded-xl border border-gray-800 overflow-hidden">
                <div className="p-4 border-b border-gray-800 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 shrink-0" />
                    <div>
                        <h5 className="text-sm font-bold text-gray-200">Giới hạn phụ thuộc vào API Key của bạn</h5>
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                            Ứng dụng sử dụng API Key cá nhân của bạn. Google áp dụng các mức giới hạn khác nhau tùy thuộc vào loại tài khoản (Miễn phí hoặc Trả phí).
                        </p>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 divide-x divide-gray-800">
                    <div className="p-4">
                        <div className="text-xs font-bold text-gray-500 uppercase mb-2">Gói Miễn Phí (Free Tier)</div>
                        <ul className="space-y-2 text-sm text-gray-300">
                            <li className="flex justify-between">
                                <span>Giới hạn phút (RPM):</span>
                                <span className="font-mono font-bold text-white">~15</span>
                            </li>
                            <li className="flex justify-between">
                                <span>Giới hạn ngày (RPD):</span>
                                <span className="font-mono font-bold text-white">~1,500</span>
                            </li>
                            <li className="flex justify-between">
                                <span>Chi phí:</span>
                                <span className="font-bold text-green-400">Miễn phí</span>
                            </li>
                        </ul>
                    </div>
                    <div className="p-4 bg-gray-900/50">
                        <div className="text-xs font-bold text-gray-500 uppercase mb-2">Gói Trả Phí (Pay-as-you-go)</div>
                        <ul className="space-y-2 text-sm text-gray-300">
                            <li className="flex justify-between">
                                <span>Giới hạn phút (RPM):</span>
                                <span className="font-mono font-bold text-white">2,000+</span>
                            </li>
                            <li className="flex justify-between">
                                <span>Giới hạn ngày:</span>
                                <span className="font-bold text-white">Không giới hạn</span>
                            </li>
                            <li className="flex justify-between">
                                <span>Chi phí:</span>
                                <span className="font-bold text-yellow-400">Theo lượt dùng</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
          </section>

          {/* Section 3: App Handling */}
          <section className="bg-green-900/10 border border-green-900/30 rounded-xl p-4 flex gap-3 items-center">
             <ShieldCheck className="w-8 h-8 text-green-500 shrink-0" />
             <div>
                 <h5 className="text-sm font-bold text-green-400">Cơ chế bảo vệ thông minh</h5>
                 <p className="text-xs text-green-200/70 mt-1">
                     Ứng dụng tự động phát hiện khi API bị quá tải (Lỗi 429) và kích hoạt chế độ 
                     <span className="font-mono font-bold mx-1">Exponential Backoff</span> 
                     (tự động chờ và thử lại sau 2s, 4s, 8s...) để đảm bảo tác vụ của bạn được hoàn thành mà không bị mất dữ liệu.
                 </p>
             </div>
          </section>

        </div>
        
        <div className="p-4 border-t border-gray-800 bg-gray-950 flex justify-end">
            <button onClick={onClose} className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-bold transition-colors">
                Đóng
            </button>
        </div>
      </div>
    </div>
  );
};
