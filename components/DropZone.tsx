import React, { useCallback } from 'react';
import { UploadCloud } from 'lucide-react';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
}

export const DropZone: React.FC<DropZoneProps> = ({ onFilesSelected }) => {
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files));
    }
  }, [onFilesSelected]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="w-full max-w-2xl p-12 bg-gray-900 border-2 border-dashed border-gray-700 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-500 hover:bg-gray-800 transition-all group"
    >
      <div className="p-4 bg-gray-800 rounded-full mb-4 group-hover:bg-blue-900/30 transition-colors">
        <UploadCloud className="w-10 h-10 text-blue-400" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">Kéo thả ảnh vào đây</h3>
      <p className="text-gray-400 mb-6">Chọn tối đa 1000 ảnh để sắp xếp và chọn lọc.</p>
      
      <label className="bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-6 rounded-lg transition-colors cursor-pointer">
        Chọn file
        <input 
          type="file" 
          multiple 
          accept="image/*" 
          className="hidden" 
          onChange={handleChange}
        />
      </label>
      <p className="text-xs text-gray-500 mt-4">Hỗ trợ: JPG, PNG, WEBP</p>
    </div>
  );
};