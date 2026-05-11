import React, { useEffect, useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ProcessedImage } from '../types';
import { getEditSuggestions, generateEnhancedImage, generateImageVariations, generateImprovementReport } from '../services/geminiService';
import { resizeImageToBase64 } from '../services/imageUtils';
import { ModalToolbar } from './ModalToolbar';
import { ImageViewer } from './ImageViewer';
import { AIEditorSidebar } from './AIEditorSidebar';

interface ImageModalProps {
  image: ProcessedImage;
  groupImages?: ProcessedImage[]; // Images from the same group
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext: boolean;
  hasPrev: boolean;
  onUpdateImage?: (updatedImage: ProcessedImage) => void;
  onBatchUpdateImages?: (updates: ProcessedImage[]) => void;
  initialShowEditor?: boolean;
}

const DEFAULT_FILTERS = { brightness: 1, contrast: 1, saturation: 1, warmth: 0 };

export const ImageModal: React.FC<ImageModalProps> = ({ 
    image, 
    groupImages = [],
    onClose, 
    onNext, 
    onPrev, 
    hasNext, 
    hasPrev,
    onUpdateImage,
    onBatchUpdateImages,
    initialShowEditor = false
}) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);

  // Editing State
  const [showEditor, setShowEditor] = useState(initialShowEditor);
  const [showSyncPanel, setShowSyncPanel] = useState(false);
  const [isGettingSuggestions, setIsGettingSuggestions] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingVariations, setIsGeneratingVariations] = useState(false);
  const [showEditedVersion, setShowEditedVersion] = useState(false); // Toggle between Original/Edited
  const [showReport, setShowReport] = useState(false); // Toggle for AI Report in footer

  // Local state for edits
  const [currentSuggestions, setCurrentSuggestions] = useState<string[]>(image.editSuggestions || []);
  const [activeFilters, setActiveFilters] = useState(image.cssFilters || DEFAULT_FILTERS);
  const [generatedUrl, setGeneratedUrl] = useState<string | undefined>(image.editedImageUrl);
  const [variations, setVariations] = useState<string[]>(image.variations || []);
  const [selectedVarIndices, setSelectedVarIndices] = useState<number[]>(image.selectedVariationIndices || []);
  const [improvementDetails, setImprovementDetails] = useState<string | undefined>(image.improvementDetails);
  
  // UI State for saving confirmation
  const [isSelectionSaved, setIsSelectionSaved] = useState(false);

  // Sync State
  const [selectedSyncIds, setSelectedSyncIds] = useState<Set<string>>(new Set());
  const [syncFilters, setSyncFilters] = useState(true);
  const [syncPrompt, setSyncPrompt] = useState(true);

  // Reset zoom and local state when image changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    
    setShowEditedVersion(!!image.editedImageUrl); // Default to edited if available
    setCurrentSuggestions(image.editSuggestions || []);
    setActiveFilters(image.cssFilters || DEFAULT_FILTERS);
    setGeneratedUrl(image.editedImageUrl);
    setVariations(image.variations || []);
    setSelectedVarIndices(image.selectedVariationIndices || []);
    setImprovementDetails(image.improvementDetails);
    setShowReport(false); // Auto collapse report on new image
    setIsSelectionSaved(false); // Reset saved state
    
    setShowSyncPanel(false); 
    setSelectedSyncIds(new Set()); 
  }, [image.id, image.editSuggestions, image.cssFilters, image.editedImageUrl, image.variations, image.improvementDetails, image.selectedVariationIndices]);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && hasNext && onNext) onNext();
      if (e.key === 'ArrowLeft' && hasPrev && onPrev) onPrev();
      if (e.key === '+' || e.key === '=') handleZoom(0.2);
      if (e.key === '-') handleZoom(-0.2);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrev, hasNext, hasPrev]);

  // Zoom Logic
  const handleZoom = (delta: number) => {
    setScale(prev => {
        const newScale = Math.min(Math.max(0.5, prev + delta), 5); // Limit zoom 0.5x to 5x
        if (newScale === 1) setPosition({ x: 0, y: 0 }); // Reset pos if reset zoom
        return newScale;
    });
  };

  // Drag Logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
        setIsDragging(true);
        dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
        e.preventDefault(); // Prevent default drag behavior
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
        setPosition({
            x: e.clientX - dragStart.current.x,
            y: e.clientY - dragStart.current.y
        });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // --- AI ACTIONS ---

  const handleGetSuggestions = async () => {
      setIsGettingSuggestions(true);
      try {
          const result = await getEditSuggestions(image);
          setCurrentSuggestions(result.suggestions);
          setActiveFilters(result.cssFilters);
          
          if (onUpdateImage) {
              onUpdateImage({
                  ...image,
                  editSuggestions: result.suggestions,
                  cssFilters: result.cssFilters
              });
          }
      } catch (e) {
          console.error("Suggestions failed", e);
          alert("Lỗi phân tích ảnh. Vui lòng thử lại.");
      } finally {
          setIsGettingSuggestions(false);
      }
  };

  useEffect(() => {
    if (showEditor && (!currentSuggestions || currentSuggestions.length === 0) && !isGettingSuggestions) {
        handleGetSuggestions();
    }
  }, [showEditor, image.id]); 

  const handleResetFilters = () => {
      setActiveFilters(DEFAULT_FILTERS);
      if (onUpdateImage) {
          onUpdateImage({
              ...image,
              cssFilters: DEFAULT_FILTERS
          });
      }
  };

  const handleFilterChange = (key: 'brightness' | 'contrast' | 'saturation' | 'warmth', value: number) => {
    const newFilters = { ...activeFilters, [key]: value };
    setActiveFilters(newFilters);
    if (onUpdateImage) {
        onUpdateImage({ ...image, cssFilters: newFilters });
    }
  };

  const handleMagicFix = async () => {
      setIsGenerating(true);
      try {
          const newImageUrl = await generateEnhancedImage(image, currentSuggestions);
          setGeneratedUrl(newImageUrl);
          setShowEditedVersion(true);
          
          const originalBase64 = await resizeImageToBase64(image.file);
          const report = await generateImprovementReport(originalBase64, newImageUrl);
          setImprovementDetails(report);
          setShowReport(true); // Auto show report

          if (onUpdateImage) {
              onUpdateImage({
                  ...image,
                  editedImageUrl: newImageUrl,
                  improvementDetails: report
              });
          }
      } catch (e) {
          console.error("Generation failed", e);
          alert("Không thể tạo ảnh mới. Vui lòng thử lại.");
      } finally {
          setIsGenerating(false);
      }
  };

  const handleGenerateVariations = async () => {
      setIsGeneratingVariations(true);
      try {
          const results = await generateImageVariations(image);
          setVariations(results);
          if (results.length > 0) {
              setGeneratedUrl(results[0]); // Auto select first one
              setShowEditedVersion(true);
          }

          if (onUpdateImage) {
              onUpdateImage({
                  ...image,
                  variations: results,
                  editedImageUrl: results.length > 0 ? results[0] : image.editedImageUrl
              });
          }
      } catch (e) {
          console.error("Variation generation failed", e);
          alert("Không thể tạo các biến thể ảnh.");
      } finally {
          setIsGeneratingVariations(false);
      }
  };

  const handleToggleVariationSelection = (index: number) => {
      const newIndices = selectedVarIndices.includes(index)
          ? selectedVarIndices.filter(i => i !== index)
          : [...selectedVarIndices, index];
      
      setSelectedVarIndices(newIndices);
      setIsSelectionSaved(false); // Reset saved status on change
      
      if (onUpdateImage) {
          onUpdateImage({
              ...image,
              selectedVariationIndices: newIndices
          });
      }
  };

  const handleSaveSelection = () => {
      if (onUpdateImage) {
           onUpdateImage({
              ...image,
              selectedVariationIndices: selectedVarIndices
          });
      }
      setIsSelectionSaved(true);
      setTimeout(() => setIsSelectionSaved(false), 2000);
  };

  // --- SYNC ACTIONS ---
  const toggleSyncSelection = (imgId: string) => {
      const newSet = new Set(selectedSyncIds);
      if (newSet.has(imgId)) newSet.delete(imgId);
      else newSet.add(imgId);
      setSelectedSyncIds(newSet);
  };

  const toggleSelectAll = () => {
      if (selectedSyncIds.size === otherImages.length) {
          setSelectedSyncIds(new Set());
      } else {
          const allIds = new Set(otherImages.map(i => i.id));
          setSelectedSyncIds(allIds);
      }
  };

  const handleApplySync = () => {
      if (!onBatchUpdateImages) return;

      const updates: ProcessedImage[] = [];
      const targets = otherImages.filter(i => selectedSyncIds.has(i.id));
      
      targets.forEach(target => {
          let updated = { ...target };
          
          if (syncFilters) {
              updated.cssFilters = activeFilters;
          }
          if (syncPrompt) {
              updated.editSuggestions = currentSuggestions;
          }
          
          updates.push(updated);
      });

      onBatchUpdateImages(updates);
      setShowSyncPanel(false);
  };

  const getFilterString = () => {
      if (showEditedVersion && generatedUrl) return 'none';
      
      const { brightness, contrast, saturation, warmth } = activeFilters;
      return `brightness(${brightness}) contrast(${contrast}) saturate(${saturation}) sepia(${warmth})`;
  };

  const isFiltersChanged = JSON.stringify(activeFilters) !== JSON.stringify(DEFAULT_FILTERS);
  const otherImages = groupImages.filter(img => img.id !== image.id);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-200 select-none"
      onClick={onClose}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Top Controls */}
      <ModalToolbar
        scale={scale}
        handleZoom={handleZoom}
        onResetZoom={() => { setScale(1); setPosition({ x: 0, y: 0 }); }}
        showEditor={showEditor}
        setShowEditor={setShowEditor}
        setShowSyncPanel={setShowSyncPanel}
        generatedUrl={generatedUrl}
        showEditedVersion={showEditedVersion}
        setShowEditedVersion={setShowEditedVersion}
        previewUrl={image.previewUrl}
        fileName={image.file.name}
        onClose={onClose}
      />

      {/* Navigation Buttons */}
      {hasPrev && (
        <button
            onClick={(e) => { e.stopPropagation(); onPrev && onPrev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-gray-800/50 hover:bg-blue-600 text-white rounded-full transition-colors z-50 hidden md:block pointer-events-auto"
        >
            <ChevronLeft className="w-8 h-8" />
        </button>
      )}

      {hasNext && (
        <button
            onClick={(e) => { e.stopPropagation(); onNext && onNext(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-gray-800/50 hover:bg-blue-600 text-white rounded-full transition-colors z-50 hidden md:block pointer-events-auto"
        >
            <ChevronRight className="w-8 h-8" />
        </button>
      )}

      {/* Editor Sidebar */}
      {showEditor && (
            <AIEditorSidebar
              showSyncPanel={showSyncPanel}
              setShowSyncPanel={setShowSyncPanel}
              otherImages={otherImages}
              showEditor={showEditor}
              setShowEditor={setShowEditor}
              isFiltersChanged={isFiltersChanged}
              handleResetFilters={handleResetFilters}
              isGettingSuggestions={isGettingSuggestions}
              handleGetSuggestions={handleGetSuggestions}
              currentSuggestions={currentSuggestions}
              activeFilters={activeFilters}
              handleFilterChange={handleFilterChange}
              isGenerating={isGenerating}
              isGeneratingVariations={isGeneratingVariations}
              handleMagicFix={handleMagicFix}
              handleGenerateVariations={handleGenerateVariations}
              improvementDetails={improvementDetails}
              showEditedVersion={showEditedVersion}
              variations={variations}
              generatedUrl={generatedUrl}
              setGeneratedUrl={(url) => setGeneratedUrl(url)}
              setShowEditedVersion={setShowEditedVersion}
              onUpdateImage={onUpdateImage}
              image={image}
              selectedVarIndices={selectedVarIndices}
              handleToggleVariationSelection={handleToggleVariationSelection}
              isSelectionSaved={isSelectionSaved}
              handleSaveSelection={handleSaveSelection}
              syncFilters={syncFilters}
              setSyncFilters={setSyncFilters}
              syncPrompt={syncPrompt}
              setSyncPrompt={setSyncPrompt}
              selectedSyncIds={selectedSyncIds}
              toggleSyncSelection={toggleSyncSelection}
              toggleSelectAll={toggleSelectAll}
              handleApplySync={handleApplySync}
            />
      )}

      {/* Main Image Container */}
      <ImageViewer
        image={image}
        showEditedVersion={showEditedVersion}
        generatedUrl={generatedUrl}
        isDragging={isDragging}
        scale={scale}
        position={position}
        imageRef={imageRef}
        handleMouseDown={handleMouseDown}
        handleMouseMove={handleMouseMove}
        getFilterString={getFilterString}
        isGenerating={isGenerating}
        isGeneratingVariations={isGeneratingVariations}
        currentSuggestions={currentSuggestions}
        isFiltersChanged={isFiltersChanged}
        showEditor={showEditor}
        showReport={showReport}
        setShowReport={setShowReport}
      />
    </div>
  );
};