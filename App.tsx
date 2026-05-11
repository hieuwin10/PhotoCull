
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { DropZone } from './components/DropZone';
import { PhotoGroup } from './components/PhotoGroup';
import { ImageModal } from './components/ImageModal';
import { TrashModal } from './components/TrashModal';
import { InfoModal } from './components/InfoModal';
import { AppState, ImageGroup, ProcessedImage } from './types';
import { Loader2, ChevronDown, ArrowDown01, Sparkles, Bot, SortAsc, SortDesc, Ban, Play, Wand2, LayoutGrid, X, Search, ListFilter, CheckSquare, ArrowDownAZ, ArrowUp, ArrowRight, CheckCircle2, Type } from 'lucide-react';
import { downloadZip, downloadAIEditsZip, ExportOptions } from './services/downloadUtils';
import { Virtuoso } from 'react-virtuoso';
import { AppHeader } from './components/AppHeader';

// Hooks
import { useProcessingStatus } from './hooks/useProcessingStatus';
import { useImageGroups } from './hooks/useImageGroups';
import { useAIAnalysis } from './hooks/useAIAnalysis';
import { useProjectManager } from './hooks/useProjectManager';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.UPLOAD);
  const [files, setFiles] = useState<File[]>([]);
  
  // Custom Hooks
  const { status, setStatus, finishStatus } = useProcessingStatus();
  
  const { 
    groups, setGroups, groupsRef, trash, setTrash,
    handleUpdateImage, handleBatchUpdateImages, handleMoveImage, handleSplitGroup, handleMergeGroups, handleSortGroups,
    handleDeleteImage, handleDeleteGroup, handleRestoreFromTrash, handleEmptyTrash
  } = useImageGroups();

  const {
    handleAnalyzeGroup, handleBatchAnalyzeAll, handleStopBatchAnalysis, isBatchAnalyzing, isBatchEnhancing,
    handleRefineGroup, handleBatchRefine, handleSmartMerge, handleSmartCleanup, handleBatchEnhanceGroup, handleBatchEnhanceAll,
    handleEnhanceSingleImage
  } = useAIAnalysis(groups, setGroups, groupsRef, setStatus, finishStatus);

  const {
    progress, pendingProjectData,
    handleFilesSelected, handleSaveProject, handleSaveProjectToFolder, handleLoadProjectClick, handleOpenProjectFolder, generateProjectJson, resetProject
  } = useProjectManager(groups, setGroups, setAppState, setStatus, finishStatus, setFiles, trash, setTrash);

  // UI State
  const [zoomedImage, setZoomedImage] = useState<ProcessedImage | null>(null);
  const [openEditorOnModal, setOpenEditorOnModal] = useState(false);
  const [showTrashModal, setShowTrashModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  
  // PERFORMANCE: Use Ref to hold prompt so we don't re-create analysis callbacks on every keystroke
  const customPromptRef = useRef(customPrompt);
  useEffect(() => { customPromptRef.current = customPrompt; }, [customPrompt]);

  const [textSize, setTextSize] = useState<'normal' | 'large'>('normal');
  
  // Export Menu State
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
      includeSelected: true,
      includeEdited: true,
      editedScope: 'all'
  });
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  
  // Batch Edit Menu States
  const [showBatchEditMenu, setShowBatchEditMenu] = useState(false); // For "All"
  const [showRangeEditMenu, setShowRangeEditMenu] = useState(false); // For "Range"
  const [showSortMenu, setShowSortMenu] = useState(false);
  
  // Batch Range State
  const [batchStartGroup, setBatchStartGroup] = useState(1);
  const [batchEndGroup, setBatchEndGroup] = useState(1); // Changed from count to End Group

  // Initialize End Group when groups change, BUT only if it hasn't been set by user interaction or load
  useEffect(() => {
      if (groups.length > 0) {
          // If end group is 1 (default) or exceeds bounds, fix it
          if (batchEndGroup === 1 || batchEndGroup > groups.length) {
              setBatchEndGroup(groups.length);
          }
      }
  }, [groups.length]);

  // Filtering State
  const [filterStatus, setFilterStatus] = useState<'all' | 'done' | 'analyzing' | 'pending'>('all');
  
  // Sorting State
  const [sortOrder, setSortOrder] = useState<'time_desc' | 'time_asc' | 'size_desc' | 'size_asc' | 'name_asc'>('time_desc');

  // Stats Calculations
  const totalGroupsCount = groups.length;
  const analyzedGroupsCount = groups.filter(g => g.status === 'done').length;
  const runningGroupsCount = groups.filter(g => g.status === 'analyzing' || g.isRefining || g.isBatchEditing).length;
  const pendingGroupsCount = totalGroupsCount - analyzedGroupsCount;
  
  // Global Image Stats
  const totalImages = useMemo(() => groups.reduce((acc, g) => acc + g.images.length, 0), [groups]);
  const selectedImagesCount = useMemo(() => groups.reduce((acc, g) => acc + g.bestImageIds.length, 0), [groups]);
  const rejectedImagesCount = totalImages - selectedImagesCount;

  const handleSort = (criteria: typeof sortOrder) => {
    setSortOrder(criteria);
    handleSortGroups(criteria);
    setShowSortMenu(false);
  };

  // Filtered Groups for Display (Status + Search)
  const filteredGroups = useMemo(() => {
      let result = groups;

      // 1. Filter by Status
      switch (filterStatus) {
          case 'done':
              result = result.filter(g => g.status === 'done');
              break;
          case 'analyzing':
              result = result.filter(g => g.status === 'analyzing' || g.isRefining || g.isBatchEditing);
              break;
          case 'pending':
              result = result.filter(g => g.status === 'pending');
              break;
          default:
              break;
      }

      // 2. Filter by Search Query
      if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          result = result.filter((g, index) => {
              // Match Group Title
              if (g.title?.toLowerCase().includes(query)) return true;
              
              // Match Group Index (e.g., search "5" matches "Group 5")
              if ((index + 1).toString() === query) return true;
              if (`nhóm ${index + 1}`.includes(query)) return true;

              // Match Filename inside group
              if (g.images.some(img => img.file.name.toLowerCase().includes(query))) return true;

              return false;
          });
      }

      return result;
  }, [groups, filterStatus, searchQuery]);

  // Identify the group of the zoomed image to pass to modal
  const zoomedGroup = useMemo(() => {
      if (!zoomedImage) return null;
      return groups.find(g => g.images.some(i => i.id === zoomedImage.id));
  }, [groups, zoomedImage]);

  // Click outside to close menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        // Simple logic to close dropdowns if clicking outside
        const target = event.target as HTMLElement;
        if (!target.closest('button') && !target.closest('.popup-menu')) {
            setShowExportMenu(false);
            setShowBatchEditMenu(false);
            setShowRangeEditMenu(false);
            setShowSortMenu(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
      const handleEscape = (event: KeyboardEvent) => {
          if (event.key === 'Escape') {
              setShowExportMenu(false);
              setShowBatchEditMenu(false);
              setShowRangeEditMenu(false);
              setShowSortMenu(false);
          }
      };
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Keyboard navigation for modal
  const handleNextImage = () => {
    if (!zoomedImage) return;
    let currentGIdx = -1;
    let currentIIdx = -1;
    groups.forEach((g, gIdx) => {
        const iIdx = g.images.findIndex(i => i.id === zoomedImage.id);
        if (iIdx !== -1) { currentGIdx = gIdx; currentIIdx = iIdx; }
    });
    if (currentGIdx === -1) return;
    if (currentIIdx < groups[currentGIdx].images.length - 1) {
        setZoomedImage(groups[currentGIdx].images[currentIIdx + 1]);
    } else if (currentGIdx < groups.length - 1) {
        setZoomedImage(groups[currentGIdx + 1].images[0]);
    }
  };

  const handlePrevImage = () => {
    if (!zoomedImage) return;
    let currentGIdx = -1;
    let currentIIdx = -1;
    groups.forEach((g, gIdx) => {
        const iIdx = g.images.findIndex(i => i.id === zoomedImage.id);
        if (iIdx !== -1) { currentGIdx = gIdx; currentIIdx = iIdx; }
    });
    if (currentGIdx === -1) return;
    if (currentIIdx > 0) {
        setZoomedImage(groups[currentGIdx].images[currentIIdx - 1]);
    } else if (currentGIdx > 0) {
        const prevGroup = groups[currentGIdx - 1];
        setZoomedImage(prevGroup.images[prevGroup.images.length - 1]);
    }
  };

  const handleEditImage = useCallback((image: ProcessedImage) => {
      setZoomedImage(image);
      setOpenEditorOnModal(true);
  }, []);
  
  const handleModalClose = () => {
      setZoomedImage(null);
      setOpenEditorOnModal(false);
  }

  const handleUpdateImageInModal = (updatedImage: ProcessedImage) => {
      setZoomedImage(updatedImage);
      handleUpdateImage(updatedImage);
  }

  // Execute for ALL groups
  const executeBatchEditAll = (modeOrPrompt: 'MAGIC' | 'VARIATIONS' | string) => {
      setShowBatchEditMenu(false);
      handleBatchEnhanceAll(modeOrPrompt); 
  };

  // Execute for RANGE of groups
  const executeRangeEdit = (modeOrPrompt: 'MAGIC' | 'VARIATIONS' | string) => {
      setShowRangeEditMenu(false);
      
      const start = Math.max(1, batchStartGroup);
      const end = Math.min(totalGroupsCount, Math.max(start, batchEndGroup));
      const count = end - start + 1;

      const range = { 
          startGroupIndex: start - 1, 
          count: count 
      };
      handleBatchEnhanceAll(modeOrPrompt, range);
  };
  
  const handleExportZip = () => {
      setShowExportMenu(false);
      downloadZip(groups, generateProjectJson(), undefined, exportOptions);
  };

  // Performance: Stable Analysis Handler using Ref
  const handleAnalyzeStable = useCallback((id: string) => {
      handleAnalyzeGroup(id, customPromptRef.current);
  }, [handleAnalyzeGroup]);

  // Define itemContent for Virtuoso
  const itemContent = useCallback((index: number, group: ImageGroup) => {
      return (
          <div className="px-4 lg:px-8 py-6">
              <PhotoGroup
                  key={group.id}
                  group={group}
                  index={index}
                  totalGroups={groupsRef.current.length}
                  searchQuery={searchQuery}
                  textSize={textSize}
                  isQueued={false}
                  onAnalyze={handleAnalyzeStable} // Use stable callback
                  onRefine={handleRefineGroup}
                  onBatchEnhance={handleBatchEnhanceGroup}
                  onImageClick={(img) => setZoomedImage(img)}
                  onMergeUp={(idx) => handleMergeGroups(idx, 'up')}
                  onMergeDown={(idx) => handleMergeGroups(idx, 'down')}
                  onMoveImage={handleMoveImage}
                  onSplitGroup={handleSplitGroup}
                  onEditImage={handleEditImage}
                  onDeleteImage={handleDeleteImage}
                  onDeleteGroup={handleDeleteGroup}
                  onQuickFix={(img) => handleEnhanceSingleImage(img, group.id)}
              />
          </div>
      );
  }, [handleAnalyzeStable, handleRefineGroup, handleBatchEnhanceGroup, handleMergeGroups, handleMoveImage, handleSplitGroup, handleEditImage, handleDeleteImage, handleDeleteGroup, handleEnhanceSingleImage, groupsRef, searchQuery, textSize]);

  // Helper for range calc display
  // Use fallbacks to avoid NaN in UI during empty input state
  const safeStart = batchStartGroup || 1;
  const safeEnd = batchEndGroup || 1;
  const rangeCount = Math.max(0, (Math.min(totalGroupsCount, safeEnd) - Math.max(1, safeStart)) + 1);

  return (
    <div className="h-full bg-gray-950 text-white flex flex-col font-sans selection:bg-blue-500/30">
      
      {/* =====================================================================================
          1. GLOBAL HEADER (Simple & Classic) with STATS
      ===================================================================================== */}
      <AppHeader 
        groups={groups}
        appState={appState}
        totalImages={totalImages}
        totalBest={selectedImagesCount}
        totalGroups={totalGroupsCount}
        handleSaveProjectToFolder={handleSaveProjectToFolder}
        handleSaveProject={handleSaveProject}
        handleOpenProjectFolder={handleOpenProjectFolder}
        handleLoadProjectClick={handleLoadProjectClick}
        downloadAIEditsZip={() => downloadAIEditsZip(groups, generateProjectJson)}
        showExportMenu={showExportMenu}
        setShowExportMenu={setShowExportMenu}
        exportOptions={exportOptions}
        setExportOptions={setExportOptions}
        handleExportZip={handleExportZip}
        resetProject={resetProject}
        trash={trash}
        setShowTrashModal={setShowTrashModal}
        setShowInfoModal={setShowInfoModal}
      />


      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-hidden relative flex flex-col">
          
          {/* =====================================================================================
              2. WORKSPACE TOOLBAR (Sticky bar for Search, Tools, Sort)
          ===================================================================================== */}
          {(appState === AppState.REVIEW || (appState === AppState.GROUPING && groups.length > 0)) && (
              <div className="min-h-14 border-b border-gray-800 bg-gray-900/90 backdrop-blur-md sticky top-0 z-40 px-3 lg:px-6 py-2 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2 shrink-0 shadow-md">
                  
                  {/* LEFT: TOOLS */}
                  <div className="flex flex-wrap items-center gap-2">
                      {/* SEARCH */}
                      <div className="relative w-full sm:w-56 transition-all sm:focus-within:w-64">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                         <input 
                             type="text" 
                             value={searchQuery}
                             onChange={(e) => setSearchQuery(e.target.value)}
                             placeholder="Tìm nhóm, tên ảnh..."
                             className="w-full bg-gray-950 border border-gray-700 rounded-lg pl-9 pr-8 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-gray-600"
                         />
                         {searchQuery && (
                             <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                                 <X className="w-3 h-3" />
                             </button>
                         )}
                     </div>

                     <div className="w-px h-6 bg-gray-700 mx-1 hidden md:block"></div>

                     {/* ANALYZE ALL */}
                     {pendingGroupsCount > 0 && (
                        <button 
                            onClick={() => handleBatchAnalyzeAll()}
                            disabled={isBatchAnalyzing}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border ${
                                isBatchAnalyzing 
                                ? 'bg-blue-900/50 text-blue-300 cursor-not-allowed border-blue-900' 
                                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 border-blue-500'
                            }`}
                        >
                            {isBatchAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-white" />}
                            <span className="hidden xl:inline">Phân tích tất cả ({pendingGroupsCount})</span>
                        </button>
                     )}

                     {/* BATCH EDIT ALL */}
                     <div className="relative z-50">
                        <button
                            onClick={() => setShowBatchEditMenu(!showBatchEditMenu)}
                            disabled={isBatchEnhancing}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border ${
                                isBatchEnhancing
                                ? 'bg-purple-900/50 text-purple-300 cursor-not-allowed border-purple-900'
                                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20 border-purple-500'
                            }`}
                        >
                            {isBatchEnhancing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                            <span className="hidden xl:inline">Sửa tất cả ({analyzedGroupsCount})</span>
                            <ChevronDown className="w-3 h-3 opacity-70" />
                        </button>

                        {showBatchEditMenu && (
                            <div className="absolute top-full left-0 mt-2 w-64 bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden animate-in slide-in-from-top-2 popup-menu">
                                <div className="px-3 py-2 bg-gray-950/50 border-b border-gray-800">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">CHẾ ĐỘ SỬA TOÀN BỘ</span>
                                </div>
                                <button onClick={() => executeBatchEditAll('MAGIC')} className="w-full text-left px-4 py-3 hover:bg-gray-800 flex items-start gap-3 transition-colors group">
                                    <Sparkles className="w-4 h-4 text-purple-400 mt-0.5 group-hover:text-purple-300" />
                                    <div>
                                        <div className="text-xs font-bold text-gray-200">Magic Fix (Tự động)</div>
                                        <div className="text-[10px] text-gray-500 mt-0.5">Tối ưu ánh sáng & chi tiết cho tất cả ảnh Best.</div>
                                    </div>
                                </button>
                                <div className="h-px bg-gray-800"></div>
                                <button onClick={() => executeBatchEditAll('VARIATIONS')} className="w-full text-left px-4 py-3 hover:bg-gray-800 flex items-start gap-3 transition-colors group">
                                    <LayoutGrid className="w-4 h-4 text-orange-400 mt-0.5 group-hover:text-orange-300" />
                                    <div>
                                        <div className="text-xs font-bold text-gray-200">Tạo Biến thể (4 Styles)</div>
                                        <div className="text-[10px] text-gray-500 mt-0.5">Tạo 4 phiên bản màu cho mỗi ảnh Best.</div>
                                    </div>
                                </button>
                            </div>
                        )}
                     </div>

                     {/* RANGE EDIT (EDIT BY GROUP) - UPDATED UX */}
                     <div className="relative z-50">
                        <button
                            onClick={() => setShowRangeEditMenu(!showRangeEditMenu)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border ${
                                showRangeEditMenu ? 'bg-gray-800 text-white border-gray-600' : 'bg-gray-900 hover:bg-gray-800 text-gray-300 border-gray-700'
                            }`}
                        >
                            <ListFilter className="w-3 h-3" />
                            <span className="hidden xl:inline">Sửa theo nhóm</span>
                        </button>

                        {showRangeEditMenu && (
                            <div className="absolute top-full left-0 mt-2 w-72 bg-gray-900 border border-gray-700 rounded-xl shadow-xl p-4 animate-in slide-in-from-top-2 popup-menu space-y-3">
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 border-b border-gray-800 pb-2 flex justify-between items-center">
                                    <span>PHẠM VI ÁP DỤNG</span>
                                    <button 
                                        onClick={() => { setBatchStartGroup(1); setBatchEndGroup(totalGroupsCount); }}
                                        className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                    >
                                        <CheckCircle2 className="w-3 h-3" /> Chọn tất cả
                                    </button>
                                </h4>
                                
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="flex-1">
                                        <label className="text-[10px] text-gray-500 font-bold mb-1 block">TỪ NHÓM SỐ</label>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                min={1} 
                                                max={totalGroupsCount} 
                                                value={batchStartGroup || ''}
                                                onChange={(e) => {
                                                    // Allow empty string or valid number, clamp only on blur to allow backspace/typing
                                                    const val = parseInt(e.target.value);
                                                    setBatchStartGroup(isNaN(val) ? 0 : val);
                                                }}
                                                onBlur={() => {
                                                    // Validate on blur
                                                    const val = Math.max(1, Math.min(totalGroupsCount, batchStartGroup || 1));
                                                    setBatchStartGroup(val);
                                                    if (val > (batchEndGroup || totalGroupsCount)) setBatchEndGroup(val);
                                                }}
                                                className="w-full bg-gray-950 border border-gray-800 rounded px-2 py-2 text-sm text-white font-mono focus:border-blue-500 outline-none text-center" 
                                                placeholder="1"
                                            />
                                        </div>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-gray-600 mt-5" />
                                    <div className="flex-1">
                                        <label className="text-[10px] text-gray-500 font-bold mb-1 block">ĐẾN SỐ (Tổng: {totalGroupsCount})</label>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                min={1} 
                                                max={totalGroupsCount} 
                                                value={batchEndGroup || ''} 
                                                onChange={(e) => {
                                                     const val = parseInt(e.target.value);
                                                     setBatchEndGroup(isNaN(val) ? 0 : val);
                                                }} 
                                                onBlur={() => {
                                                    const val = Math.max(1, Math.min(totalGroupsCount, batchEndGroup || totalGroupsCount));
                                                    setBatchEndGroup(val);
                                                    if (val < (batchStartGroup || 1)) setBatchStartGroup(val);
                                                }}
                                                className="w-full bg-gray-950 border border-gray-800 rounded px-2 py-2 text-sm text-white font-mono focus:border-blue-500 outline-none text-center"
                                                placeholder={totalGroupsCount.toString()}
                                            />
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="text-[10px] text-center text-gray-500 mb-4 bg-gray-800/30 py-1 rounded">
                                    Sẽ áp dụng cho <span className="text-white font-bold">{rangeCount}</span> nhóm
                                </div>
                                
                                <div className="space-y-2">
                                    <button onClick={() => executeRangeEdit('MAGIC')} className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20"><Sparkles className="w-3 h-3" /> Chạy Magic Fix</button>
                                    <button onClick={() => executeRangeEdit('VARIATIONS')} className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-600 rounded-lg text-xs font-bold flex items-center justify-center gap-2"><LayoutGrid className="w-3 h-3" /> Chạy Biến thể</button>
                                </div>
                            </div>
                        )}
                     </div>
                  </div>

                  {/* RIGHT: SORT & STATS */}
                  <div className="flex flex-wrap items-center gap-2 xl:gap-4">
                     
                     {/* TEXT SIZE TOGGLE (NEW) */}
                     <button 
                        onClick={() => setTextSize(prev => prev === 'normal' ? 'large' : 'normal')}
                        className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs font-bold transition-colors ${
                            textSize === 'large' 
                            ? 'bg-blue-900/30 text-blue-300 border-blue-800' 
                            : 'bg-gray-950 border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800'
                        }`}
                        title="Thay đổi cỡ chữ (Vừa / Lớn)"
                     >
                        <Type className="w-4 h-4" />
                        <span className="hidden lg:inline">{textSize === 'normal' ? 'Cỡ chữ: Vừa' : 'Cỡ chữ: Lớn'}</span>
                     </button>

                     {/* SORT */}
                     <div className="relative z-40">
                        <button onClick={() => setShowSortMenu(v => !v)} className="flex items-center gap-2 px-3 py-1.5 bg-gray-950 border border-gray-700 rounded-lg text-xs font-bold text-gray-300 hover:text-white hover:bg-gray-800 transition-colors">
                            <ArrowDownAZ className="w-4 h-4" />
                            <span className="hidden lg:inline">Sắp xếp</span>
                            <ChevronDown className="w-3 h-3" />
                        </button>
                        {showSortMenu && (
                        <div className="absolute top-full right-0 mt-2 w-56 bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden animate-in slide-in-from-top-2 popup-menu">
                            <button onClick={() => handleSort('time_desc')} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-800 flex items-center gap-2 ${sortOrder === 'time_desc' ? 'text-blue-400 bg-blue-900/10' : 'text-gray-300'}`}><SortDesc className="w-4 h-4" /> Mới nhất</button>
                            <button onClick={() => handleSort('time_asc')} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-800 flex items-center gap-2 ${sortOrder === 'time_asc' ? 'text-blue-400 bg-blue-900/10' : 'text-gray-300'}`}><SortAsc className="w-4 h-4" /> Cũ nhất</button>
                            <div className="h-px bg-gray-800 my-1"></div>
                            <button onClick={() => handleSort('size_desc')} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-800 flex items-center gap-2 ${sortOrder === 'size_desc' ? 'text-blue-400 bg-blue-900/10' : 'text-gray-300'}`}><ArrowDown01 className="w-4 h-4" /> Nhiều ảnh nhất</button>
                            <button onClick={() => handleSort('size_asc')} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-800 flex items-center gap-2 ${sortOrder === 'size_asc' ? 'text-blue-400 bg-blue-900/10' : 'text-gray-300'}`}><ArrowUp className="w-4 h-4" /> Ít ảnh nhất</button>
                            <button onClick={() => handleSort('name_asc')} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-800 flex items-center gap-2 ${sortOrder === 'name_asc' ? 'text-blue-400 bg-blue-900/10' : 'text-gray-300'}`}><ArrowDownAZ className="w-4 h-4" /> Tên (A-Z)</button>
                        </div>
                        )}
                     </div>

                     <div className="w-px h-6 bg-gray-700 hidden lg:block"></div>

                     {/* FILTER STATS */}
                     <div className="hidden lg:flex bg-gray-950 rounded-lg p-1.5 border border-gray-800">
                         <button onClick={() => setFilterStatus('all')} className={`px-6 py-2.5 rounded-md text-base font-bold transition-all ${filterStatus === 'all' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>
                             Tất cả ({totalGroupsCount})
                         </button>
                         <button onClick={() => setFilterStatus('done')} className={`px-6 py-2.5 rounded-md text-base font-bold transition-all ${filterStatus === 'done' ? 'bg-green-900/40 text-green-400 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>
                             Xong ({analyzedGroupsCount})
                         </button>
                         <button onClick={() => setFilterStatus('analyzing')} className={`px-6 py-2.5 rounded-md text-base font-bold transition-all ${filterStatus === 'analyzing' ? 'bg-blue-900/40 text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>
                             Đang chạy ({runningGroupsCount})
                         </button>
                         <button onClick={() => setFilterStatus('pending')} className={`px-6 py-2.5 rounded-md text-base font-bold transition-all ${filterStatus === 'pending' ? 'bg-orange-900/40 text-orange-400 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>
                             Chưa xong ({pendingGroupsCount})
                         </button>
                     </div>
                  </div>
              </div>
          )}

          {/* CONTENT VIEW */}
          {appState === AppState.UPLOAD && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
                  <div className="text-center mb-8">
                       <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300 mb-2">
                           Sắp xếp & Chọn lọc Ảnh Thông Minh
                       </h2>
                       <p className="text-gray-400">Sử dụng AI để nhóm, lọc và chỉnh sửa ảnh hàng loạt.</p>
                  </div>
                  <DropZone onFilesSelected={handleFilesSelected} />
                  
                  {progress && (
                      <div className="mt-8 w-full max-w-md bg-gray-900 rounded-full h-4 overflow-hidden border border-gray-800 relative">
                          <div 
                              className="h-full bg-blue-600 transition-all duration-300"
                              style={{ width: `${(progress.current / progress.total) * 100}%` }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white shadow-black drop-shadow-md">
                              Đang xử lý {progress.current}/{progress.total}
                          </div>
                      </div>
                  )}
              </div>
          )}

          {(appState === AppState.GROUPING || appState === AppState.REVIEW) && (
              <div className="flex-1 min-h-0">
                  {appState === AppState.GROUPING && progress ? (
                      <div className="h-full flex flex-col items-center justify-center text-gray-500">
                          <Loader2 className="w-12 h-12 mb-2 animate-spin text-blue-500" />
                          <p className="mb-4 text-white">Đang phân tích và nhóm ảnh...</p>
                          <div className="w-full max-w-md bg-gray-900 rounded-full h-4 overflow-hidden border border-gray-800 relative">
                              <div 
                                  className="h-full bg-blue-600 transition-all duration-300"
                                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white shadow-black drop-shadow-md">
                                  Đang xử lý {progress.current}/{progress.total}
                              </div>
                          </div>
                      </div>
                  ) : filteredGroups.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-gray-500">
                          <Search className="w-12 h-12 mb-2 opacity-20" />
                          <p>Không tìm thấy nhóm ảnh nào phù hợp.</p>
                      </div>
                  ) : (
                      <Virtuoso
                          style={{ height: '100%' }}
                          totalCount={filteredGroups.length}
                          itemContent={(index) => itemContent(index, filteredGroups[index])}
                          className="scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent"
                          overscan={{ main: 500, reverse: 500 }} // Pre-render content outside viewport
                          increaseViewportBy={200} // Increase rendering area
                      />
                  )}
              </div>
          )}

          {/* Processing Status Overlay */}
          {status && status.isActive && (
               <div className="absolute bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4">
                   <div className={`px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-md flex items-center gap-3 max-w-sm ${
                       status.type === 'error' ? 'bg-red-900/80 border-red-500/50 text-white' :
                       status.type === 'success' ? 'bg-green-900/80 border-green-500/50 text-white' :
                       'bg-gray-900/80 border-blue-500/30 text-white'
                   }`}>
                       {status.type === 'loading' ? (
                           <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                       ) : status.type === 'success' ? (
                           <CheckSquare className="w-5 h-5 text-green-400" />
                       ) : status.type === 'error' ? (
                           <Ban className="w-5 h-5 text-red-400" />
                       ) : (
                           <Bot className="w-5 h-5 text-blue-400" />
                       )}
                       
                       <div>
                           <div className="text-xs font-bold opacity-70 uppercase tracking-wider">{status.taskName}</div>
                           <div className="text-sm font-medium">{status.details}</div>
                           {status.percent > 0 && status.percent < 100 && (
                               <div className="w-full bg-gray-700/50 h-1 mt-1.5 rounded-full overflow-hidden">
                                   <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${status.percent}%` }} />
                               </div>
                           )}
                       </div>
                       
                       {status.type === 'loading' && (
                           <button 
                                onClick={handleStopBatchAnalysis}
                                className="p-1 hover:bg-white/20 rounded-full transition-colors ml-2"
                                title="Dừng xử lý"
                           >
                               <X className="w-4 h-4 text-white/70" />
                           </button>
                       )}
                   </div>
               </div>
          )}
      </main>

      {/* Status Bar */}
      <div className="h-6 bg-gray-900 border-t border-gray-800 px-4 flex items-center justify-between text-xs text-gray-500 shrink-0">
          <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${status && status.isActive ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></span>
              <span>{status && status.isActive ? `Đang xử lý: ${status.taskName}` : 'Trạng thái: Sẵn sàng'}</span>
          </div>
          <div className="flex items-center gap-4">
              <span>Tổng ảnh: <span className="text-gray-300 font-medium">{totalImages}</span></span>
              <span>Đã chọn: <span className="text-gray-300 font-medium">{selectedImagesCount}</span></span>
              <span>Số nhóm: <span className="text-gray-300 font-medium">{totalGroupsCount}</span></span>
          </div>
      </div>

      {/* Modals */}
      {zoomedImage && (
          <ImageModal
              image={zoomedImage}
              groupImages={zoomedGroup?.images}
              onClose={handleModalClose}
              onNext={handleNextImage}
              onPrev={handlePrevImage}
              hasNext={(() => {
                  if (!zoomedImage || groups.length === 0) return false;
                  const lastGroup = groups[groups.length - 1];
                  if (!lastGroup.images.length) return false;
                  return zoomedImage.id !== lastGroup.images[lastGroup.images.length - 1].id;
              })()}
              hasPrev={(() => {
                  if (!zoomedImage || groups.length === 0) return false;
                  const firstGroup = groups[0];
                  if (!firstGroup.images.length) return false;
                  return zoomedImage.id !== firstGroup.images[0].id;
              })()}
              onUpdateImage={handleUpdateImageInModal}
              onBatchUpdateImages={handleBatchUpdateImages}
              initialShowEditor={openEditorOnModal}
          />
      )}

      <TrashModal
          isOpen={showTrashModal}
          onClose={() => setShowTrashModal(false)}
          trashItems={trash}
          onRestore={(id) => { handleRestoreFromTrash(id); setShowTrashModal(false); }}
          onEmptyTrash={() => { handleEmptyTrash(); setShowTrashModal(false); }}
      />
      
      <InfoModal 
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
      />
    </div>
  );
};

export default App;
