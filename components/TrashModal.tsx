
import React from 'react';
import { X, RefreshCcw, Trash2, Folder, Image as ImageIcon } from 'lucide-react';
import { TrashItem, ProcessedImage, ImageGroup } from '../types';

interface TrashModalProps {
    isOpen: boolean;
    onClose: () => void;
    trashItems: TrashItem[];
    onRestore: (id: string) => void;
    onEmptyTrash: () => void;
}

export const TrashModal: React.FC<TrashModalProps> = ({ 
    isOpen, 
    onClose, 
    trashItems, 
    onRestore, 
    onEmptyTrash 
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-3xl h-[80vh] flex flex-col shadow-2xl relative">
                {/* Header */}
                <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-900/30 rounded-lg">
                            <Trash2 className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Thùng rác ({trashItems.length})</h3>
                            <p className="text-xs text-gray-500">Các mục đã xóa có thể được khôi phục tại đây.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full transition-colors">
                        <X className="w-6 h-6 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-gray-800">
                    {trashItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-4">
                            <Trash2 className="w-16 h-16 opacity-20" />
                            <p>Thùng rác trống</p>
                        </div>
                    ) : (
                        trashItems.map((item) => {
                            const isGroup = item.type === 'group';
                            const data = item.data;
                            const title = isGroup ? (data as ImageGroup).title || 'Nhóm không tên' : (data as ProcessedImage).file.name;
                            const imgUrl = isGroup 
                                ? (data as ImageGroup).images[0]?.thumbnailUrl 
                                : (data as ProcessedImage).thumbnailUrl;
                            const count = isGroup ? (data as ImageGroup).images.length : 1;

                            return (
                                <div key={item.id} className="bg-gray-800/50 border border-gray-700 rounded-xl p-3 flex items-center gap-4 hover:border-gray-500 transition-colors">
                                    <div className="w-12 h-12 rounded-lg bg-gray-900 overflow-hidden shrink-0 border border-gray-700 relative">
                                        {imgUrl ? (
                                            <img src={imgUrl} alt="" className="w-full h-full object-cover opacity-60 grayscale" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <ImageIcon className="w-6 h-6 text-gray-700" />
                                            </div>
                                        )}
                                        {isGroup && (
                                            <div className="absolute bottom-0 right-0 bg-blue-600 text-white text-[9px] px-1 rounded-tl">
                                                {count}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            {isGroup ? <Folder className="w-3 h-3 text-blue-400" /> : <ImageIcon className="w-3 h-3 text-green-400" />}
                                            <h4 className="font-medium text-sm text-gray-300 truncate">{title}</h4>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            Đã xóa: {new Date(item.deletedAt).toLocaleString()}
                                        </p>
                                    </div>

                                    <button 
                                        onClick={() => onRestore(item.id)}
                                        className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 hover:text-blue-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-2"
                                    >
                                        <RefreshCcw className="w-3 h-3" />
                                        Khôi phục
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                {trashItems.length > 0 && (
                    <div className="p-4 border-t border-gray-800 bg-gray-900/90 flex justify-end">
                        <button 
                            onClick={onEmptyTrash}
                            className="px-4 py-2 bg-red-900/20 hover:bg-red-900/40 border border-red-900/50 text-red-400 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Xóa vĩnh viễn tất cả
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
