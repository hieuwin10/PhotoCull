import React from 'react';
import { Loader2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { ProcessedImage } from '../types';

interface ImageViewerProps {
  image: ProcessedImage;
  showEditedVersion: boolean;
  generatedUrl?: string;
  isDragging: boolean;
  scale: number;
  position: { x: number; y: number };
  imageRef: React.RefObject<HTMLImageElement>;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  getFilterString: () => string;
  isGenerating: boolean;
  isGeneratingVariations: boolean;
  currentSuggestions: string[];
  isFiltersChanged: boolean;
  showEditor: boolean;
  showReport: boolean;
  setShowReport: (val: boolean) => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  image,
  showEditedVersion,
  generatedUrl,
  isDragging,
  scale,
  position,
  imageRef,
  handleMouseDown,
  handleMouseMove,
  getFilterString,
  isGenerating,
  isGeneratingVariations,
  currentSuggestions,
  isFiltersChanged,
  showEditor,
  showReport,
  setShowReport
}) => {
  return (
    <div 
      className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden"
      onClick={e => e.stopPropagation()} // Stop click through
    >
      <div 
          className="relative w-full h-[85vh] flex items-center justify-center overflow-hidden"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
      >
          <img 
              ref={imageRef}
              src={showEditedVersion && generatedUrl ? generatedUrl : image.previewUrl} 
              alt={image.file.name}
              className={`max-w-full max-h-full object-contain transition-all duration-300 ${isDragging ? 'cursor-grabbing' : scale > 1 ? 'cursor-grab' : 'cursor-default'}`}
              style={{ 
                  transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                  filter: getFilterString()
              }}
          />
          
          {/* Status Overlay for Single Image Edit */}
          {(isGenerating || isGeneratingVariations) && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-6 py-3 bg-black/80 text-white text-sm font-bold rounded-2xl shadow-2xl backdrop-blur border border-white/20 z-20 flex flex-col items-center gap-2 animate-in fade-in zoom-in duration-300">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                  <span>{isGenerating ? "AI đang Magic Fix..." : "AI đang tạo biến thể..."}</span>
              </div>
          )}

          {/* Overlay label if editing */}
          {showEditedVersion && generatedUrl && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-purple-600/90 text-white text-xs font-bold rounded-full shadow-lg backdrop-blur pointer-events-none z-10 flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-yellow-300" />
                  <span>AI Enhanced</span>
              </div>
          )}
          
          {/* Overlay label if filtered but not generated */}
          {!showEditedVersion && currentSuggestions.length > 0 && !generatedUrl && isFiltersChanged && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600/90 text-white text-xs font-bold rounded-full shadow-lg backdrop-blur pointer-events-none z-10">
                  Smart Filter On
              </div>
          )}
      </div>
      
      {/* Info Panel - Hidden on Mobile if sidebar is open */}
      <div className={`absolute bottom-6 max-w-2xl w-[90%] pointer-events-auto transition-opacity duration-300 ${showEditor ? 'opacity-0 md:opacity-100' : 'opacity-100'}`}>
           <div className="bg-black/60 px-6 py-4 rounded-2xl backdrop-blur-md border border-white/10 shadow-2xl mx-auto">
              <div className="flex justify-between items-start mb-2">
                  <h3 className="text-white font-bold text-lg truncate pr-4">{image.file.name}</h3>
                  <div className="flex gap-2 shrink-0">
                      {image.isBest && (
                          <span className="text-green-400 text-xs font-bold px-2 py-1 bg-green-900/40 rounded border border-green-800/50">
                              ĐƯỢC CHỌN
                          </span>
                      )}
                      <span className="text-gray-400 text-xs px-2 py-1 bg-gray-800 rounded">
                          {(image.file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                  </div>
              </div>
              
              {image.reason && (
                  <div className={`border-t pt-2 mt-2 ${image.isBest ? 'border-green-500/30' : 'border-red-500/30'}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${image.isBest ? 'text-green-400' : 'text-red-400'}`}>
                          {image.isBest ? 'Tại sao chọn?' : 'Tại sao không chọn?'}
                      </p>
                      <p className="text-gray-200 text-sm leading-relaxed line-clamp-2 md:line-clamp-none">
                          {image.reason}
                      </p>
                  </div>
              )}
              
              {/* AI Report Toggle (Bottom Panel) */}
              {image.improvementDetails && showEditedVersion && (
                  <div className="border-t border-white/10 pt-2 mt-2">
                       <button 
                          onClick={() => setShowReport(!showReport)}
                          className="flex items-center gap-2 text-xs font-bold text-green-400 hover:text-green-300 transition-colors w-full"
                       >
                          <Sparkles className="w-3 h-3" />
                          <span>Báo cáo cải thiện AI</span>
                          {showReport ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                       </button>
                       {showReport && (
                           <div className="mt-2 text-sm text-green-100/90 leading-relaxed bg-green-900/20 p-2 rounded-lg border border-green-500/20 animate-in fade-in slide-in-from-top-1">
                               {image.improvementDetails}
                           </div>
                       )}
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};
