import React from 'react';
import { 
    X, ChevronLeft, Loader2, Sparkles, Sliders, Copy, CheckSquare, Square, Sun, Contrast, Droplet, Flame, LayoutGrid, FileText,
    CheckCircle2, Circle, Save, RotateCcw
} from 'lucide-react';
import { ProcessedImage } from '../types';

interface AIEditorSidebarProps {
  showSyncPanel: boolean;
  setShowSyncPanel: (val: boolean) => void;
  otherImages: ProcessedImage[];
  showEditor: boolean;
  setShowEditor: (val: boolean) => void;
  isFiltersChanged: boolean;
  handleResetFilters: () => void;
  isGettingSuggestions: boolean;
  handleGetSuggestions: () => void;
  currentSuggestions: string[];
  activeFilters: { brightness: number; contrast: number; saturation: number; warmth: number };
  handleFilterChange: (key: 'brightness' | 'contrast' | 'saturation' | 'warmth', value: number) => void;
  isGenerating: boolean;
  isGeneratingVariations: boolean;
  handleMagicFix: () => void;
  handleGenerateVariations: () => void;
  improvementDetails?: string;
  showEditedVersion: boolean;
  variations: string[];
  generatedUrl?: string;
  setGeneratedUrl: (val: string) => void;
  setShowEditedVersion: (val: boolean) => void;
  onUpdateImage?: (updatedImage: ProcessedImage) => void;
  image: ProcessedImage;
  selectedVarIndices: number[];
  handleToggleVariationSelection: (index: number) => void;
  isSelectionSaved: boolean;
  handleSaveSelection: () => void;
  syncFilters: boolean;
  setSyncFilters: (val: boolean) => void;
  syncPrompt: boolean;
  setSyncPrompt: (val: boolean) => void;
  selectedSyncIds: Set<string>;
  toggleSyncSelection: (imgId: string) => void;
  toggleSelectAll: () => void;
  handleApplySync: () => void;
}

const FilterSlider = ({ icon, label, value, min, max, step, onChange }: { 
    icon: React.ReactNode, label: string, value: number, min: number, max: number, step: number, onChange: (val: number) => void 
}) => (
    <div className="flex flex-col gap-2 group">
        <div className="flex justify-between text-[10px] text-gray-400 uppercase font-bold tracking-wider">
            <span className="flex items-center gap-1.5 group-hover:text-blue-400 transition-colors">{icon} {label}</span>
            <span className="font-mono text-white">{value.toFixed(2)}</span>
        </div>
        <div className="relative flex items-center h-4">
             <input 
                type="range" 
                min={min} max={max} step={step} 
                value={value} 
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
        </div>
    </div>
);

export const AIEditorSidebar: React.FC<AIEditorSidebarProps> = ({
  showSyncPanel,
  setShowSyncPanel,
  otherImages,
  showEditor,
  setShowEditor,
  isFiltersChanged,
  handleResetFilters,
  isGettingSuggestions,
  handleGetSuggestions,
  currentSuggestions,
  activeFilters,
  handleFilterChange,
  isGenerating,
  isGeneratingVariations,
  handleMagicFix,
  handleGenerateVariations,
  improvementDetails,
  showEditedVersion,
  variations,
  generatedUrl,
  setGeneratedUrl,
  setShowEditedVersion,
  onUpdateImage,
  image,
  selectedVarIndices,
  handleToggleVariationSelection,
  isSelectionSaved,
  handleSaveSelection,
  syncFilters,
  setSyncFilters,
  syncPrompt,
  setSyncPrompt,
  selectedSyncIds,
  toggleSyncSelection,
  toggleSelectAll,
  handleApplySync
}) => {
  return (
    <div 
        className="absolute md:top-20 md:left-4 md:bottom-20 md:w-80 top-[15%] bottom-0 left-0 right-0 md:right-auto bg-gray-950/95 backdrop-blur-xl border-t md:border border-white/10 md:rounded-2xl rounded-t-3xl p-0 z-40 flex flex-col shadow-2xl animate-in slide-in-from-bottom-10 md:slide-in-from-left-4 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
    >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5 rounded-t-3xl md:rounded-t-2xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                {showSyncPanel ? <Copy className="w-4 h-4 text-purple-400"/> : <Sliders className="w-4 h-4 text-blue-400" />}
                {showSyncPanel ? 'Đồng bộ chỉnh sửa' : 'Bộ công cụ AI'}
            </h3>
            <button onClick={() => setShowEditor(false)} className="md:hidden p-2 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
            </button>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin scrollbar-thumb-gray-700 relative">
            
            {!showSyncPanel ? (
                <>
                    {/* SYNC BUTTON */}
                    {otherImages.length > 0 && (
                        <button 
                            onClick={() => setShowSyncPanel(true)}
                            className="w-full py-2 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-500/30 text-purple-300 rounded-lg text-xs font-bold flex items-center justify-center gap-2 mb-2"
                        >
                            <Copy className="w-3 h-3" />
                            Áp dụng cho {otherImages.length} ảnh cùng nhóm
                        </button>
                    )}

                    {/* Section 1: AI Suggestions */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">AI Phân tích & Gợi ý</h4>
                            {isFiltersChanged && (
                                <button 
                                    onClick={handleResetFilters}
                                    className="text-[10px] flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors font-medium bg-red-900/20 px-2 py-0.5 rounded"
                                    title="Đặt lại màu sắc về mặc định"
                                >
                                    <RotateCcw className="w-3 h-3" /> Reset
                                </button>
                            )}
                        </div>

                        <div className="bg-gray-900/50 rounded-xl p-3 border border-white/5 space-y-3">
                            <button 
                                onClick={handleGetSuggestions}
                                disabled={isGettingSuggestions}
                                className="w-full py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-600/30 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
                                title="Nhờ AI phân tích ảnh và đề xuất thông số chỉnh sửa"
                            >
                                {isGettingSuggestions ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                {currentSuggestions.length > 0 ? 'Phân tích lại' : 'Phân tích ảnh'}
                            </button>

                            {currentSuggestions.length > 0 ? (
                                <ul className="text-xs text-gray-300 space-y-2 pl-1">
                                    {currentSuggestions.map((s, i) => (
                                        <li key={i} className="flex gap-2">
                                            <span className="text-blue-500">•</span>
                                            {s}
                                        </li>
                                    ))}
                                </ul>
                            ) : !isGettingSuggestions && (
                                <p className="text-xs text-gray-600 text-center italic py-1">Nhấn "Phân tích" để nhận gợi ý.</p>
                            )}
                        </div>
                    </div>

                    {/* Section 2: Smart Filters (Renamed from Manual Sliders) */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bộ lọc Smart Filter</h4>
                        
                        <FilterSlider 
                            icon={<Sun className="w-3 h-3" />} 
                            label="Độ sáng" 
                            value={activeFilters.brightness} 
                            min={0.5} max={1.5} step={0.05}
                            onChange={(v) => handleFilterChange('brightness', v)} 
                        />
                        <FilterSlider 
                            icon={<Contrast className="w-3 h-3" />} 
                            label="Tương phản" 
                            value={activeFilters.contrast} 
                            min={0.5} max={1.5} step={0.05}
                            onChange={(v) => handleFilterChange('contrast', v)} 
                        />
                        <FilterSlider 
                            icon={<Droplet className="w-3 h-3" />} 
                            label="Bão hòa" 
                            value={activeFilters.saturation} 
                            min={0} max={2} step={0.1}
                            onChange={(v) => handleFilterChange('saturation', v)} 
                        />
                        <FilterSlider 
                            icon={<Flame className="w-3 h-3" />} 
                            label="Độ ấm" 
                            value={activeFilters.warmth} 
                            min={0} max={1} step={0.05}
                            onChange={(v) => handleFilterChange('warmth', v)} 
                        />
                    </div>

                    <div className="h-px bg-white/10" />

                    {/* Section 3: Generative AI */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">AI Tạo sinh (Generative)</h4>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={handleMagicFix}
                                disabled={isGenerating || isGeneratingVariations}
                                className="col-span-1 p-3 bg-gradient-to-br from-indigo-900/50 to-purple-900/50 hover:from-indigo-800/50 hover:to-purple-800/50 border border-indigo-500/30 text-indigo-300 rounded-xl transition-all flex flex-col items-center justify-center gap-2 group relative overflow-hidden"
                                title="Tự động cải thiện ánh sáng, chi tiết và làm đẹp ảnh"
                            >
                                <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                                <span className="text-xs font-bold">Magic Fix</span>
                            </button>

                            <button 
                                onClick={handleGenerateVariations}
                                disabled={isGenerating || isGeneratingVariations}
                                className="col-span-1 p-3 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30 text-gray-300 rounded-xl transition-all flex flex-col items-center justify-center gap-2"
                                title="Tạo 4 phiên bản màu sắc và phong cách khác nhau"
                            >
                                {isGeneratingVariations ? <Loader2 className="w-5 h-5 animate-spin" /> : <LayoutGrid className="w-5 h-5" />}
                                <span className="text-xs font-bold">Biến thể</span>
                            </button>
                        </div>
                    </div>
                    
                    {/* Improvement Details Report (Sidebar Version) - Keeping it for redundancy/visibility in sidebar */}
                    {improvementDetails && showEditedVersion && (
                        <div className="bg-green-900/10 border border-green-500/30 rounded-xl p-3 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center gap-2 mb-1">
                                <FileText className="w-3 h-3 text-green-400" />
                                <span className="text-xs font-bold text-green-300">Báo cáo cải thiện AI</span>
                            </div>
                            <p className="text-xs text-green-100/80 leading-relaxed italic">
                                "{improvementDetails}"
                            </p>
                        </div>
                    )}

                    {/* Variations List */}
                    {variations.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <h5 className="text-[10px] font-bold text-gray-500 uppercase">Kết quả biến thể</h5>
                                <span className="text-[10px] text-gray-500 italic">Chọn biến thể để xuất</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {variations.map((url, idx) => {
                                    const isSelected = selectedVarIndices.includes(idx);
                                    return (
                                        <div key={idx} className="relative group/var">
                                            <button
                                                onClick={() => {
                                                    setGeneratedUrl(url);
                                                    setShowEditedVersion(true);
                                                    if (onUpdateImage) {
                                                        onUpdateImage({ ...image, editedImageUrl: url });
                                                    }
                                                }}
                                                className={`relative w-full aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                                                    generatedUrl === url ? 'border-green-500 ring-2 ring-green-500/20' : 'border-transparent hover:border-gray-500'
                                                }`}
                                            >
                                                <img src={url} className="w-full h-full object-cover" alt={`Variation ${idx}`} />
                                            </button>
                                            
                                            {/* SELECTION TOGGLE */}
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleToggleVariationSelection(idx);
                                                }}
                                                className="absolute top-1 right-1 p-1 rounded-full bg-black/60 hover:bg-black/80 transition-colors z-20"
                                                title={isSelected ? "Bỏ chọn xuất" : "Chọn để xuất"}
                                            >
                                                {isSelected 
                                                    ? <CheckCircle2 className="w-4 h-4 text-green-400 fill-green-900/50" />
                                                    : <Circle className="w-4 h-4 text-gray-400" />
                                                }
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                            
                            {/* EXPLICIT SAVE BUTTON */}
                            <button
                                onClick={handleSaveSelection}
                                className={`w-full py-2 mt-1 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                                    isSelectionSaved
                                    ? 'bg-green-600 border-green-500 text-white'
                                    : 'bg-gray-800 hover:bg-gray-700 border-gray-600 text-gray-300'
                                }`}
                            >
                                {isSelectionSaved ? (
                                    <>
                                        <CheckCircle2 className="w-3 h-3" />
                                        Đã lưu lựa chọn
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-3 h-3" />
                                        Lưu biến thể để xuất sau
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </>
            ) : (
                // SYNC PANEL
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <button 
                        onClick={() => setShowSyncPanel(false)}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-white mb-2"
                    >
                        <ChevronLeft className="w-3 h-3" /> Quay lại
                    </button>

                    <div className="space-y-2">
                        <h4 className="text-xs font-bold text-gray-300">Chọn thông số đồng bộ:</h4>
                        <label className="flex items-center gap-2 text-xs text-gray-400 hover:text-white cursor-pointer p-2 rounded bg-gray-900 border border-gray-800">
                            <input type="checkbox" checked={syncFilters} onChange={e => setSyncFilters(e.target.checked)} className="rounded bg-gray-800 border-gray-600 text-purple-500 focus:ring-purple-500/50" />
                            <span>Smart Filters</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs text-gray-400 hover:text-white cursor-pointer p-2 rounded bg-gray-900 border border-gray-800">
                            <input type="checkbox" checked={syncPrompt} onChange={e => setSyncPrompt(e.target.checked)} className="rounded bg-gray-800 border-gray-600 text-purple-500 focus:ring-purple-500/50" />
                            <span>Gợi ý AI (Prompt)</span>
                        </label>
                    </div>

                    <div className="flex items-center justify-between mt-4 mb-2">
                        <h4 className="text-xs font-bold text-gray-300">Chọn ảnh áp dụng ({selectedSyncIds.size}):</h4>
                        <button onClick={toggleSelectAll} className="text-[10px] text-purple-400 hover:text-purple-300 font-bold">
                            {selectedSyncIds.size === otherImages.length ? 'Bỏ chọn' : 'Chọn tất cả'}
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
                        {otherImages.map(img => {
                            const isSelected = selectedSyncIds.has(img.id);
                            return (
                                <button 
                                    key={img.id}
                                    onClick={() => toggleSyncSelection(img.id)}
                                    className={`relative aspect-square rounded-lg overflow-hidden border transition-all ${isSelected ? 'border-purple-500 ring-1 ring-purple-500' : 'border-gray-800 opacity-60 hover:opacity-100'}`}
                                >
                                    <img src={img.thumbnailUrl || img.previewUrl} className="w-full h-full object-cover" alt="" />
                                    <div className="absolute top-1 right-1">
                                        {isSelected ? <CheckSquare className="w-4 h-4 text-purple-500 bg-black rounded-sm" /> : <Square className="w-4 h-4 text-gray-400" />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <button 
                        onClick={handleApplySync}
                        disabled={selectedSyncIds.size === 0 || (!syncFilters && !syncPrompt)}
                        className="w-full py-3 mt-4 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-purple-900/20"
                    >
                        Áp dụng ngay
                    </button>
                </div>
            )}
        </div>
    </div>
  );
};
