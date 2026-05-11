
import React, { useState, memo } from 'react';
import { ProcessedImage } from '../types';
import { Star, ZoomIn, ArrowLeft, ArrowRight, Scissors, ImageIcon, Brush, Download, Sparkles, Trash2, Wand2 } from 'lucide-react';

interface PhotoCardProps {
  img: ProcessedImage;
  isBest: boolean;
  isRejected: boolean;
  isHighlighted?: boolean; // New: Highlight if search matches
  groupIndex: number;
  totalGroups: number;
  imageIndex: number;
  onClick: (image: ProcessedImage) => void;
  onMoveImage: (imgId: string, direction: 'prev' | 'next') => void;
  onSplitGroup: (imgId: string) => void;
  onEdit: (image: ProcessedImage) => void;
  onDelete?: (image: ProcessedImage) => void;
  onQuickFix: (image: ProcessedImage) => void; // New
}

export const PhotoCard: React.FC<PhotoCardProps> = memo(({ 
    img, 
    isBest, 
    isRejected, 
    isHighlighted = false,
    groupIndex, 
    totalGroups, 
    imageIndex,
    onClick, 
    onMoveImage, 
    onSplitGroup,
    onEdit,
    onDelete,
    onQuickFix
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const hasEdit = !!img.editedImageUrl;

  // Determine border/ring style
  let ringClass = '';
  if (isHighlighted) {
      ringClass = 'ring-4 ring-yellow-500 z-20 scale-[1.05] shadow-[0_0_20px_rgba(234,179,8,0.5)]';
  } else if (isBest) {
      ringClass = 'ring-4 ring-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)] z-10 scale-[1.02]';
  }

  return (
    <div 
      className={`relative group/card rounded-xl overflow-hidden transition-all duration-300 transform-gpu backface-hidden ${ringClass} ${
        !isHighlighted && isRejected 
            ? 'opacity-50 grayscale hover:grayscale-0 hover:opacity-100' 
            : !isHighlighted && !isBest 
                ? 'border border-gray-700 hover:border-gray-500' 
                : ''
      } bg-gray-900 aspect-square flex flex-col will-change-transform`}
    >
        {/* Image Container */}
        <div 
            className="flex-1 relative cursor-zoom-in overflow-hidden"
            onClick={() => onClick(img)}
        >
            <img 
                src={img.thumbnailUrl || img.previewUrl} 
                alt="thumbnail" 
                loading="lazy"
                decoding="async"
                onLoad={() => setIsLoaded(true)}
                className={`w-full h-full object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
            
            {!isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <ImageIcon className="w-8 h-8 text-gray-700 animate-pulse" />
                </div>
            )}

            {/* Hover Actions Overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 transition-opacity flex flex-col justify-between p-2 will-change-[opacity]">
                 <div className="flex justify-between items-start">
                     {/* Move Prev */}
                     {groupIndex > 0 && (
                         <button 
                            onClick={(e) => { e.stopPropagation(); onMoveImage(img.id, 'prev'); }}
                            className="p-1.5 bg-black/50 hover:bg-blue-600 rounded-full text-white backdrop-blur-sm transition-colors"
                            title="Di chuyển sang nhóm trước"
                         >
                             <ArrowLeft className="w-4 h-4" />
                         </button>
                     )}
                     
                     <div className="flex-1"></div>

                     {/* Delete Button (New) */}
                     {onDelete && (
                         <button
                            onClick={(e) => { e.stopPropagation(); onDelete(img); }}
                            className="p-1.5 bg-black/50 hover:bg-red-600 rounded-full text-white backdrop-blur-sm transition-colors mr-1"
                            title="Xóa ảnh (Chuyển vào thùng rác)"
                         >
                             <Trash2 className="w-4 h-4" />
                         </button>
                     )}

                     {/* Move Next */}
                     {groupIndex < totalGroups - 1 && (
                         <button 
                            onClick={(e) => { e.stopPropagation(); onMoveImage(img.id, 'next'); }}
                            className="p-1.5 bg-black/50 hover:bg-blue-600 rounded-full text-white backdrop-blur-sm transition-colors"
                            title="Di chuyển sang nhóm sau"
                         >
                             <ArrowRight className="w-4 h-4" />
                         </button>
                     )}
                 </div>

                 <div className="flex justify-center">
                      <ZoomIn className="w-8 h-8 text-white/80 opacity-0 group-hover/card:opacity-100 transition-opacity scale-75 group-hover/card:scale-100 duration-200" />
                 </div>

                 <div className="flex justify-between items-end">
                     {/* Split Group Button */}
                     {imageIndex > 0 ? (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onSplitGroup(img.id); }}
                            className="p-1.5 bg-black/50 hover:bg-purple-600 rounded-full text-white backdrop-blur-sm transition-colors"
                            title="Tách nhóm từ ảnh này"
                        >
                            <Scissors className="w-4 h-4" />
                        </button>
                     ) : (
                         <div /> /* Spacer */
                     )}

                     <div className="flex items-center gap-2">
                        {/* Download OR Quick Magic Fix */}
                        {hasEdit ? (
                            <a
                                href={img.editedImageUrl}
                                download={`AI_Fix_${img.file.name}`}
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 rounded-full text-white backdrop-blur-sm transition-colors shadow-lg flex items-center justify-center bg-purple-600/80 hover:bg-purple-500 ring-1 ring-purple-400"
                                title="Tải ảnh AI sửa về máy"
                            >
                                <Download className="w-4 h-4" />
                            </a>
                        ) : (
                             <button
                                onClick={(e) => { e.stopPropagation(); onQuickFix(img); }}
                                className="p-1.5 rounded-full text-white backdrop-blur-sm transition-colors shadow-lg flex items-center justify-center bg-indigo-600/80 hover:bg-indigo-500 ring-1 ring-indigo-400 group/wand"
                                title="Tạo ảnh AI (Magic Fix)"
                            >
                                <Wand2 className="w-4 h-4 group-hover/wand:animate-pulse" />
                            </button>
                        )}

                        {/* Edit Button */}
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(img); }}
                            className="p-1.5 bg-black/50 hover:bg-blue-500 rounded-full text-white backdrop-blur-sm transition-colors shadow-lg"
                            title="Chỉnh sửa AI"
                        >
                            <Brush className="w-4 h-4" />
                        </button>
                     </div>
                 </div>
            </div>

            {/* Badges */}
            <div className="absolute top-2 right-2 flex flex-col gap-1 z-20">
                {isBest && (
                    <div className="bg-green-500 text-white p-1.5 rounded-full shadow-lg" title="Ảnh đẹp nhất (Best Pick)">
                        <Star className="w-4 h-4 fill-white" />
                    </div>
                )}
            </div>

            {/* AI Edit Badge (Left Side) */}
            {hasEdit && (
                <div className="absolute top-2 left-2 bg-purple-600 text-white p-1.5 rounded-full shadow-lg z-20 border border-purple-400 animate-pulse" title="Đã có bản sửa AI">
                    <Sparkles className="w-3 h-3 fill-white" />
                </div>
            )}
        </div>
        
        {/* Info Bar */}
        <div className={`px-2 py-1.5 text-[10px] font-mono truncate flex justify-between items-center ${isHighlighted ? 'bg-yellow-900/30 text-yellow-200 font-bold' : isBest ? 'bg-green-900/30 text-green-200' : 'bg-gray-800 text-gray-400'}`}>
            <span className="truncate flex-1">{img.file.name}</span>
            <span className="opacity-60 ml-2">{(img.file.size / 1024 / 1024).toFixed(1)}MB</span>
        </div>
    </div>
  );
});
