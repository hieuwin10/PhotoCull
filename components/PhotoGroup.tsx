
import React, { memo, useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { ImageGroup, ProcessedImage } from '../types';
import { PhotoCard } from './PhotoCard';
import { 
  Wand2, 
  Split, 
  Loader2, 
  CheckCircle2, 
  ArrowUp, 
  ArrowDown,
  Palette,
  Brush,
  Lightbulb,
  Sparkles,
  Download,
  ZoomIn,
  LayoutGrid,
  Trash2,
  ChevronDown,
  AlertTriangle,
  RotateCw
} from 'lucide-react';

interface PhotoGroupProps {
  group: ImageGroup;
  index: number;
  totalGroups: number;
  searchQuery?: string;
  textSize?: 'normal' | 'large';
  isQueued?: boolean;
  onAnalyze: (groupId: string) => void;
  onRefine: (groupId: string) => void;
  onImageClick: (image: ProcessedImage) => void;
  onMergeUp: (index: number) => void;
  onMergeDown: (index: number) => void;
  onMoveImage: (groupId: string, imgId: string, direction: 'prev' | 'next') => void;
  onSplitGroup: (groupId: string, imgId: string) => void;
  onEditImage: (image: ProcessedImage) => void;
  onBatchEnhance: (groupId: string, mode?: 'MAGIC' | 'VARIATIONS') => void;
  onDeleteImage: (groupId: string, imgId: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onQuickFix: (image: ProcessedImage) => void; // New Prop
}

const PhotoGroupComponent: React.FC<PhotoGroupProps> = ({
  group,
  index,
  totalGroups,
  searchQuery = '',
  textSize = 'normal',
  isQueued = false,
  onAnalyze,
  onRefine,
  onImageClick,
  onMergeUp,
  onMergeDown,
  onMoveImage,
  onSplitGroup,
  onEditImage,
  onBatchEnhance,
  onDeleteImage,
  onDeleteGroup,
  onQuickFix
}) => {
  const isAnalyzing = group.status === 'analyzing';
  const isDone = group.status === 'done';
  const isRefining = group.isRefining;
  const isBatchEditing = group.isBatchEditing;
  const isSingle = group.images.length === 1;

  // Font Size Classes logic
  const textBaseClass = textSize === 'large' ? 'text-lg leading-relaxed' : 'text-xs';
  const titleSizeClass = textSize === 'large' ? 'text-2xl' : 'text-lg';
  const iconSizeClass = textSize === 'large' ? 'w-5 h-5' : 'w-3 h-3';

  // Detect Error State - Memoize specifically to avoid recalc
  const isError = useMemo(() => 
      group.tags?.includes('Lỗi') || 
      group.title?.startsWith('Lỗi') || 
      group.title === 'Hết Quota' || 
      group.title === 'Server Bận' ||
      group.title === 'Sai API Key' ||
      group.selectionReason?.startsWith('⚠️'),
  [group.tags, group.title, group.selectionReason]);

  // Local state for dropdown
  const showEditMenuState = useState(false);
  const [showEditMenu, setShowEditMenu] = showEditMenuState;
  const editMenuRef = useRef<HTMLDivElement>(null);

  // Filter images that have been edited - MEMOIZED for Performance
  const editedImages = useMemo(() => 
      group.images.filter(img => !!img.editedImageUrl),
  [group.images]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (editMenuRef.current && !editMenuRef.current.contains(event.target as Node)) {
            setShowEditMenu(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Determine container style based on status
  let borderClass = 'border-gray-800';
  let bgClass = 'bg-gray-900/50';

  if (isDone) {
      borderClass = 'border-green-900/30';
  } else if (isAnalyzing) {
      borderClass = 'border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)]';
      bgClass = 'bg-blue-900/10';
  } 

  // Memoize these handlers
  const handleMoveImage = useCallback((imgId: string, dir: 'prev' | 'next') => {
      onMoveImage(group.id, imgId, dir);
  }, [group.id, onMoveImage]);

  const handleSplitGroup = useCallback((imgId: string) => {
      onSplitGroup(group.id, imgId);
  }, [group.id, onSplitGroup]);

  const handleDeleteImage = useCallback((img: ProcessedImage) => {
      onDeleteImage(group.id, img.id);
  }, [group.id, onDeleteImage]);

  const handleEdit = useCallback((image: ProcessedImage) => {
      onEditImage(image);
  }, [onEditImage]);

  const handleEditBest = useCallback(() => {
      const bestImg = group.images.find(img => group.bestImageIds.includes(img.id));
      const targetImg = bestImg || group.images[0];
      if (targetImg) onEditImage(targetImg);
  }, [group.images, group.bestImageIds, onEditImage]);

  // Check if there are any suggestions to display - Memoized
  const hasSuggestions = useMemo(() => 
      group.images.some(img => img.editSuggestions && img.editSuggestions.length > 0),
  [group.images]);

  const isSmallPending = group.images.length < 4 && !isDone;

  return (
    <div className={`mb-6 rounded-2xl border transition-all duration-300 ${bgClass} ${borderClass} content-auto contain-layout shadow-sm ${isSmallPending ? 'max-w-4xl' : ''}`}>
      {/* Header */}
      <div className="p-5 border-b border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-30 rounded-t-2xl transform-gpu">
        
        {/* Left: Title & Info & Merge Controls */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          
          {/* Merge Controls - Left */}
          <div className="flex flex-col gap-1 shrink-0">
            {index > 0 ? (
                <button 
                    onClick={() => onMergeUp(index)}
                    className="p-1.5 bg-gray-800 hover:bg-blue-600 hover:text-white text-gray-400 rounded-md border border-gray-700 transition-colors shadow-sm"
                    title="Gộp với nhóm trên"
                >
                    <ArrowUp className="w-4 h-4" />
                </button>
            ) : <div className="w-[30px]" />} 
            
            {index < totalGroups - 1 ? (
                <button 
                    onClick={() => onMergeDown(index)}
                    className="p-1.5 bg-gray-800 hover:bg-blue-600 hover:text-white text-gray-400 rounded-md border border-gray-700 transition-colors shadow-sm"
                    title="Gộp với nhóm dưới"
                >
                    <ArrowDown className="w-4 h-4" />
                </button>
            ) : <div className="w-[30px]" />}
          </div>

          <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl border font-mono shrink-0 transition-colors ${
              isError ? 'bg-red-900/30 border-red-500/50 text-red-400' :
              isAnalyzing ? 'bg-blue-900/30 border-blue-500/50 text-blue-400' :
              'bg-gray-800 border-gray-700 text-white'
          }`}>
             <span className="text-xs opacity-70">NHÓM</span>
             <span className="text-lg font-bold">{index + 1}</span>
          </div>

          <div className="min-w-0 flex-1">
             <div className="flex items-center gap-3">
                 <h3 className={`font-bold ${titleSizeClass} flex items-center gap-2 truncate ${isError ? 'text-red-400' : 'text-white'}`}>
                   <span className="truncate">{group.title || `Nhóm ảnh ${index + 1}`}</span>
                 </h3>
                 
                 {/* Status Badges */}
                 {isError && (
                     <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-300">
                         <AlertTriangle className="w-3 h-3" />
                         <span className="text-[10px] font-bold uppercase whitespace-nowrap">LỖI XỬ LÝ</span>
                     </div>
                 )}
                 
                 {isAnalyzing && (
                     <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 animate-pulse">
                         <Loader2 className="w-3 h-3 animate-spin" />
                         <span className="text-[10px] font-bold uppercase whitespace-nowrap">Đang phân tích...</span>
                     </div>
                 )}

                 {isBatchEditing && (
                     <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border animate-pulse ${
                         group.batchAction === 'VARIATIONS' 
                         ? 'bg-orange-900/30 border-orange-500/40 text-orange-300' 
                         : 'bg-purple-900/30 border-purple-500/40 text-purple-300'
                     }`}>
                         <Loader2 className="w-3 h-3 animate-spin" />
                         <span className="text-[10px] font-bold uppercase whitespace-nowrap">
                             {group.batchAction === 'VARIATIONS' ? 'ĐANG TẠO BIẾN THỂ...' : 'ĐANG MAGIC FIX...'}
                         </span>
                     </div>
                 )}
             </div>

             <div className="flex items-center gap-2 mt-1 overflow-hidden">
                <span className={`${textBaseClass} text-gray-400 whitespace-nowrap`}>{group.images.length} ảnh</span>
                
                {group.tags && group.tags.length > 0 && (
                   <>
                       <span className="text-gray-700">•</span>
                       <div className="flex gap-1 overflow-x-auto scrollbar-none">
                          {group.tags.map(tag => (
                              <span key={tag} className={`text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap ${tag === 'Lỗi' ? 'bg-red-900/50 border-red-700 text-red-300' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
                                 {tag}
                              </span>
                          ))}
                       </div>
                   </>
               )}
             </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap md:flex-nowrap justify-end">
          
          <button
              onClick={() => onDeleteGroup(group.id)}
              className="px-3 py-1.5 bg-red-900/10 hover:bg-red-900/30 text-red-500 border border-red-900/30 rounded-lg text-xs font-bold transition-all flex items-center gap-2 mr-2"
              title="Xóa toàn bộ nhóm"
          >
              <Trash2 className="w-3 h-3" />
              <span className="hidden lg:inline">Xóa</span>
          </button>

          {isError ? (
             <button 
                onClick={() => onAnalyze(group.id)}
                disabled={isAnalyzing}
                className="px-4 py-2 rounded-lg text-sm font-bold shadow-lg transition-all flex items-center gap-2 min-w-[140px] justify-center bg-yellow-600 hover:bg-yellow-500 text-white shadow-yellow-900/20 border border-yellow-500"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang thử lại...
                  </>
                ) : (
                  <>
                    <RotateCw className="w-4 h-4" />
                    Thử lại
                  </>
                )}
              </button>
          ) : isDone ? (
            <div className="flex items-center gap-2 relative">
                 <button
                    onClick={() => onRefine(group.id)}
                    disabled={isRefining}
                    className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-bold transition-all border border-gray-700 flex items-center gap-2"
                    title="Kiểm tra xem nhóm có nên tách ra không"
                 >
                    {isRefining ? <Loader2 className="w-3 h-3 animate-spin" /> : <Split className="w-3 h-3" />}
                    <span className="hidden lg:inline">Phân tách</span>
                 </button>

                 <button
                    onClick={handleEditBest}
                    className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-blue-300 rounded-lg text-xs font-bold transition-all border border-gray-700 flex items-center gap-2"
                    title="Mở trình sửa ảnh (cho ảnh tốt nhất)"
                 >
                    <Brush className="w-3 h-3" />
                    <span className="hidden lg:inline">Sửa ảnh</span>
                 </button>

                 {/* DROPDOWN FOR AI FIX */}
                 <div ref={editMenuRef}>
                     <button
                        onClick={() => !isBatchEditing && setShowEditMenu(!showEditMenu)}
                        disabled={isBatchEditing}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-2 ${
                            isBatchEditing 
                            ? 'bg-purple-900/30 text-purple-400 border-purple-800'
                            : 'bg-gray-800 hover:bg-gray-700 text-purple-300 border-gray-700'
                        }`}
                        title="Tùy chọn AI Fix cho nhóm"
                     >
                        {isBatchEditing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Palette className="w-3 h-3" />}
                        <span className="hidden lg:inline">AI Fix màu</span>
                        {!isBatchEditing && <ChevronDown className="w-3 h-3 opacity-70" />}
                     </button>
                     
                     {showEditMenu && (
                         <div className="absolute top-full right-0 mt-2 w-56 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in slide-in-from-top-2">
                             <div className="px-3 py-2 bg-gray-950/50 border-b border-gray-800">
                                 <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">CHỈNH SỬA NHÓM NÀY</span>
                             </div>
                             <button 
                                 onClick={() => { setShowEditMenu(false); onBatchEnhance(group.id, 'MAGIC'); }}
                                 className="w-full text-left px-4 py-3 hover:bg-gray-800 flex items-start gap-3 transition-colors group"
                             >
                                 <Sparkles className="w-4 h-4 text-purple-400 mt-0.5 group-hover:text-purple-300" />
                                 <div>
                                     <div className="text-xs font-bold text-gray-200">Tự động tối ưu (Magic Fix)</div>
                                     <div className="text-[10px] text-gray-500 mt-0.5">1 Ảnh kết quả, tối ưu ánh sáng/độ nét.</div>
                                 </div>
                             </button>
                             <div className="h-px bg-gray-800"></div>
                             <button 
                                 onClick={() => { setShowEditMenu(false); onBatchEnhance(group.id, 'VARIATIONS'); }}
                                 className="w-full text-left px-4 py-3 hover:bg-gray-800 flex items-start gap-3 transition-colors group"
                             >
                                 <LayoutGrid className="w-4 h-4 text-orange-400 mt-0.5 group-hover:text-orange-300" />
                                 <div>
                                     <div className="text-xs font-bold text-gray-200">Sáng tạo đa dạng (4 Styles)</div>
                                     <div className="text-[10px] text-gray-500 mt-0.5">Tạo 4 phiên bản phong cách khác nhau.</div>
                                 </div>
                             </button>
                         </div>
                     )}
                 </div>

                 <button 
                    onClick={() => onAnalyze(group.id)}
                    className="px-3 py-1.5 bg-green-900/30 hover:bg-green-900/50 text-green-400 border border-green-800 rounded-lg text-xs font-bold transition-colors flex items-center gap-2"
                 >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Xong</span>
                 </button>
            </div>
          ) : (
            <button 
              onClick={() => onAnalyze(group.id)}
              disabled={isAnalyzing}
              className={`px-4 py-2 rounded-lg text-sm font-bold shadow-lg transition-all flex items-center gap-2 min-w-[140px] justify-center ${
                isAnalyzing 
                  ? 'bg-blue-900/50 text-blue-300 cursor-not-allowed border border-blue-800'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang phân tích...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Phân tích AI
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Analysis Reason */}
      {(group.selectionReason || group.rejectionReason) && (
          <div className={`px-6 py-5 border-b border-gray-800 ${textBaseClass} flex flex-col gap-3 ${isError ? 'bg-red-950/30 text-red-200' : 'bg-black/20 text-gray-400'}`}>
              {group.selectionReason && (
                  <div className="flex gap-2">
                      <span className={`${isError ? 'text-red-400' : 'text-green-500'} font-bold shrink-0`}>{isError ? '⚠️' : '[+]'}</span>
                      <span className="leading-relaxed">{group.selectionReason}</span>
                  </div>
              )}
              {group.rejectionReason && (
                  <div className="flex gap-2">
                       <span className="text-red-500 font-bold shrink-0">[-]</span>
                       <span className="leading-relaxed">{group.rejectionReason}</span>
                  </div>
              )}
          </div>
      )}

      {/* NEW: Editing Suggestions Section */}
      {isDone && hasSuggestions && (
          <div className={`px-6 py-5 bg-blue-900/10 border-b border-blue-900/20 ${textBaseClass} text-gray-300`}>
             <div className="flex items-center gap-2 text-blue-400 font-bold mb-4">
                 <Lightbulb className={iconSizeClass} />
                 <span>Gợi ý chỉnh sửa chi tiết:</span>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                 {group.images.map(img => (
                     (img.editSuggestions && img.editSuggestions.length > 0) ? (
                         <div key={img.id} className="flex gap-2 items-start pl-2">
                             <span className="text-gray-500 font-mono whitespace-nowrap shrink-0">• {img.file.name}:</span>
                             <span className="text-gray-300 italic leading-relaxed">{img.editSuggestions.join(', ')}</span>
                         </div>
                     ) : null
                 ))}
             </div>
          </div>
      )}

      {/* Images Grid */}
      <div className={`p-5 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 ${isSingle ? 'bg-gray-900/30' : ''}`}>
        {group.images.map((img, imgIdx) => (
          <PhotoCard 
            key={img.id} 
            img={img}
            isBest={group.bestImageIds.includes(img.id)}
            isRejected={isDone && !group.bestImageIds.includes(img.id)}
            isHighlighted={searchQuery ? img.file.name.toLowerCase().includes(searchQuery.toLowerCase()) : false}
            groupIndex={index}
            totalGroups={totalGroups}
            imageIndex={imgIdx}
            onClick={onImageClick}
            onMoveImage={handleMoveImage}
            onSplitGroup={handleSplitGroup}
            onEdit={handleEdit}
            onDelete={handleDeleteImage}
            onQuickFix={onQuickFix}
          />
        ))}
      </div>

      {/* Edited Images Gallery */}
      {editedImages.length > 0 && (
          <div className="border-t border-gray-800/50 bg-gradient-to-b from-purple-900/5 to-purple-900/10 p-5 rounded-b-2xl animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2 mb-3 px-1">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider">Kết quả AI Fix màu ({editedImages.length})</h4>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {editedImages.map(img => (
                      <div key={`edited-${img.id}`} className="group relative aspect-square rounded-xl overflow-hidden border border-purple-500/30 shadow-lg shadow-purple-900/10 flex flex-col bg-gray-900 transform-gpu transition-transform hover:scale-[1.02]">
                          <div className="flex-1 relative overflow-hidden">
                              <img 
                                  src={img.editedImageUrl} 
                                  alt="Edited" 
                                  loading="lazy"
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center items-center gap-2">
                                    <button 
                                        onClick={() => onEditImage(img)}
                                        className="p-2 bg-black/50 hover:bg-purple-600 text-white rounded-full transition-colors"
                                        title="Xem và chỉnh sửa chi tiết"
                                    >
                                        <ZoomIn className="w-4 h-4" />
                                    </button>
                                    <a 
                                        href={img.editedImageUrl} 
                                        download={`enhanced_${img.file.name}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-2 bg-black/50 hover:bg-green-600 text-white rounded-full transition-colors"
                                        title="Tải ảnh"
                                    >
                                        <Download className="w-4 h-4" />
                                    </a>
                              </div>
                              
                              {/* Indicator for Variations */}
                              {img.variations && img.variations.length > 0 && (
                                <div className="absolute top-2 right-2 bg-orange-600/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1">
                                    <LayoutGrid className="w-3 h-3" />
                                    {img.variations.length}
                                </div>
                              )}
                          </div>
                          
                          {/* SHOW WHAT WAS EDITED */}
                          <div className="p-2.5 bg-gray-900 text-xs border-t border-purple-500/20">
                              <div className="text-purple-300 font-bold mb-0.5 truncate">{img.file.name}</div>
                              {img.variations && img.variations.length > 0 ? (
                                  <div className="text-orange-300 font-bold">
                                      🎨 4 Biến thể
                                  </div>
                              ) : (
                                img.editSuggestions && img.editSuggestions.length > 0 ? (
                                    <div className="text-gray-400 line-clamp-2 leading-tight">
                                        ✨ {img.editSuggestions.join(', ')}
                                    </div>
                                ) : (
                                    <div className="text-gray-500 italic">Đã tối ưu hoá</div>
                                )
                              )}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
};

// Custom comparison function for React.memo
function arePropsEqual(prev: PhotoGroupProps, next: PhotoGroupProps) {
  // 1. Simple props check
  if (prev.index !== next.index) return false;
  if (prev.totalGroups !== next.totalGroups) return false;
  if (prev.searchQuery !== next.searchQuery) return false;
  if (prev.textSize !== next.textSize) return false;

  // 2. Group Data Deep Check
  // Use reference equality for the group object first (fastest)
  if (prev.group === next.group) return true;

  const pg = prev.group;
  const ng = next.group;

  // Check critical fields that affect rendering
  if (pg.id !== ng.id) return false;
  if (pg.status !== ng.status) return false;
  if (pg.isRefining !== ng.isRefining) return false;
  if (pg.isBatchEditing !== ng.isBatchEditing) return false;
  if (pg.batchAction !== ng.batchAction) return false; // NEW check
  if (pg.title !== ng.title) return false;
  if (pg.selectionReason !== ng.selectionReason) return false;
  if (pg.rejectionReason !== ng.rejectionReason) return false;
  
  // Tags array check
  if (pg.tags !== ng.tags) {
      if (!pg.tags || !ng.tags) return false;
      if (pg.tags.length !== ng.tags.length) return false;
      if (pg.tags.some((t, i) => t !== ng.tags![i])) return false;
  }

  // Best IDs check
  if (pg.bestImageIds !== ng.bestImageIds) {
      if (pg.bestImageIds.length !== ng.bestImageIds.length) return false;
      if (pg.bestImageIds.join(',') !== ng.bestImageIds.join(',')) return false;
  }

  // CRITICAL PERFORMANCE FIX:
  // Instead of looping through all images to check for differences (O(N)), 
  // we rely on the parent hook (useImageGroups) to provide a NEW array reference
  // whenever any image inside changes.
  // This reduces check time to O(1).
  if (pg.images !== ng.images) return false;

  return true;
}

export const PhotoGroup = memo(PhotoGroupComponent, arePropsEqual);
