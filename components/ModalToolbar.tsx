import React from 'react';
import { ZoomOut, ZoomIn, RotateCcw, Wand2, ToggleRight, ToggleLeft, Download, Sparkles, X } from 'lucide-react';

interface ModalToolbarProps {
  scale: number;
  handleZoom: (delta: number) => void;
  onResetZoom: () => void;
  showEditor: boolean;
  setShowEditor: (val: boolean) => void;
  setShowSyncPanel: (val: boolean) => void;
  generatedUrl?: string;
  showEditedVersion: boolean;
  setShowEditedVersion: (val: boolean) => void;
  previewUrl: string;
  fileName: string;
  onClose: () => void;
}

export const ModalToolbar: React.FC<ModalToolbarProps> = ({
  scale,
  handleZoom,
  onResetZoom,
  showEditor,
  setShowEditor,
  setShowSyncPanel,
  generatedUrl,
  showEditedVersion,
  setShowEditedVersion,
  previewUrl,
  fileName,
  onClose
}) => {
  return (
    <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50 pointer-events-none">
      <div className="flex gap-2 pointer-events-auto items-center">
        {/* Zoom Controls */}
        <div className="bg-gray-800/80 rounded-lg flex items-center overflow-hidden border border-gray-700">
          <button
            onClick={(e) => { e.stopPropagation(); handleZoom(-0.25); }}
            className="p-2 hover:bg-gray-700 text-white transition-colors"
            title="Thu nhỏ (-)"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-xs w-10 text-center font-mono text-gray-300">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); handleZoom(0.25); }}
            className="p-2 hover:bg-gray-700 text-white transition-colors"
            title="Phóng to (+)"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onResetZoom(); }}
            className="p-2 hover:bg-gray-700 text-gray-400 border-l border-gray-700 transition-colors"
            title="Đặt lại"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* AI Toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); setShowEditor(!showEditor); setShowSyncPanel(false); }}
          className={`p-2 rounded-lg flex items-center gap-2 border transition-all ${
            showEditor
              ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/20'
              : 'bg-gray-800/80 border-gray-700 text-gray-300 hover:bg-gray-700'
          }`}
        >
          <Wand2 className="w-4 h-4" />
          <span className="text-xs font-bold hidden sm:inline">Trình sửa AI</span>
        </button>

        {/* Compare Toggle (Only if generated exists) */}
        {generatedUrl && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowEditedVersion(!showEditedVersion); }}
            className="p-2 bg-gray-800/80 border border-gray-700 rounded-lg text-green-400 flex items-center gap-2 hover:bg-gray-700 transition-colors"
            title="So sánh giữa ảnh Gốc và ảnh AI"
          >
            {showEditedVersion ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
            <span className="text-xs font-bold">{showEditedVersion ? 'Đã sửa' : 'Ảnh gốc'}</span>
          </button>
        )}

        {/* Download Buttons Group */}
        <div className="h-8 w-px bg-gray-700 mx-1 hidden sm:block"></div>

        <a
          href={previewUrl}
          download={fileName}
          onClick={(e) => e.stopPropagation()}
          className="p-2 bg-gray-800/80 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors flex items-center gap-2"
          title="Tải ảnh gốc về máy"
        >
          <Download className="w-4 h-4" />
          <span className="text-xs font-bold hidden md:inline">Gốc</span>
        </a>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (generatedUrl) {
              const link = document.createElement('a');
              link.href = generatedUrl;
              link.download = `enhanced_${fileName}`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }
          }}
          disabled={!generatedUrl}
          className={`p-2 rounded-lg border flex items-center gap-2 transition-all ${
            generatedUrl
              ? 'bg-green-600/90 border-green-500 text-white hover:bg-green-500 shadow-lg shadow-green-900/20 cursor-pointer'
              : 'bg-gray-800/50 border-gray-700 text-gray-600 cursor-not-allowed opacity-50'
          }`}
          title={generatedUrl ? "Tải ảnh AI sửa" : "Chưa có ảnh AI sửa"}
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-xs font-bold hidden md:inline">AI Fix</span>
        </button>
      </div>

      <button
        onClick={onClose}
        className="p-2 bg-gray-800/50 hover:bg-red-600/80 text-white rounded-full transition-all pointer-events-auto"
      >
        <X className="w-6 h-6" />
      </button>
    </div>
  );
};
