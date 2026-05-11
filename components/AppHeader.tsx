import React from 'react';
import { AppState, ImageGroup, ExportOptions } from '../types';
import { Camera, HardDrive, Save, FolderOpen, Upload, Sparkles, FolderDown, ChevronUp, ChevronDown, Download } from 'lucide-react';

interface AppHeaderProps {
    groups: ImageGroup[];
    appState: AppState;
    totalImages: number;
    totalBest: number;
    totalGroups: number;
    handleSaveProjectToFolder: () => void;
    handleSaveProject: () => void;
    handleOpenProjectFolder: () => void;
    handleLoadProjectClick: () => void;
    downloadAIEditsZip: () => void;
    showExportMenu: boolean;
    setShowExportMenu: (show: boolean) => void;
    exportOptions: ExportOptions;
    setExportOptions: (options: ExportOptions) => void;
    handleExportZip: () => void;
    resetProject: () => void;
    trash: any[];
    setShowTrashModal: (show: boolean) => void;
    setShowInfoModal: (show: boolean) => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
    groups,
    appState,
    totalImages,
    totalBest,
    totalGroups,
    handleSaveProjectToFolder,
    handleSaveProject,
    handleOpenProjectFolder,
    handleLoadProjectClick,
    downloadAIEditsZip,
    showExportMenu,
    setShowExportMenu,
    exportOptions,
    setExportOptions,
    handleExportZip,
    resetProject,
    trash,
    setShowTrashModal,
    setShowInfoModal
}) => {
    return (
        <header className="h-16 border-b border-gray-800 bg-gray-950 px-6 flex items-center justify-between shrink-0 z-50 shadow-md">
            
            {/* LOGO */}
            <div className="flex items-center gap-2.5 shrink-0">
                <div className="bg-blue-600 p-1.5 rounded-lg">
                    <Camera className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-lg font-bold text-gray-100 tracking-tight hidden md:block">
                    PhotoCull <span className="text-blue-500">AI</span>
                </h1>
            </div>

            {/* PROJECT STATS (DASHBOARD MINI) */}
            {groups.length > 0 && (
                <div className="hidden xl:flex items-center gap-6 mx-6 bg-gray-900/50 border border-gray-800 rounded-lg px-6 py-2 transition-all hover:bg-gray-900/80 hover:border-gray-700">
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Tổng ảnh</span>
                        <span className="text-sm font-bold text-white leading-none mt-0.5">{totalImages}</span>
                    </div>
                     <div className="w-px h-6 bg-gray-800"></div>
                     <div className="flex flex-col items-center">
                        <span className="text-[10px] text-green-500/70 font-bold uppercase tracking-wide">Được chọn</span>
                        <span className="text-sm font-bold text-green-500 leading-none mt-0.5">{totalBest}</span>
                    </div>
                     <div className="w-px h-6 bg-gray-800"></div>
                     <div className="flex flex-col items-center">
                        <span className="text-[10px] text-blue-500/70 font-bold uppercase tracking-wide">Nhóm ảnh</span>
                        <span className="text-sm font-bold text-blue-400 leading-none mt-0.5">{totalGroups}</span>
                    </div>
                </div>
            )}

            {/* ACTION BUTTONS */}
            <div className="flex items-center gap-3">
                
                {/* INFO BUTTON (NEW) */}
                <button 
                    onClick={() => setShowInfoModal(true)}
                    className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-800 rounded-lg transition-colors"
                    title="Thông tin mô hình & giới hạn"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                </button>

                {/* TRASH BUTTON */}
                {trash.length > 0 && (
                    <button 
                        onClick={() => setShowTrashModal(true)}
                        className="px-3 py-1.5 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/40 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        <span className="hidden sm:inline">{trash.length}</span>
                    </button>
                )}
                
                {/* PROJECT ACTIONS */}
                {groups.length > 0 && (
                     <>
                        <button onClick={handleSaveProjectToFolder} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-purple-300 rounded-lg text-sm font-medium transition-colors border border-gray-700 flex items-center gap-2" title="Lưu Folder">
                            <HardDrive className="w-4 h-4" /><span className="hidden 2xl:inline">Lưu Folder</span>
                        </button>
                        <button onClick={handleSaveProject} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors border border-gray-700 flex items-center gap-2" title="Lưu JSON">
                            <Save className="w-4 h-4" /><span className="hidden 2xl:inline">Lưu JSON</span>
                        </button>
                     </>
                )}
                
                {appState === AppState.UPLOAD && (
                     <>
                        <button onClick={handleOpenProjectFolder} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold transition-colors shadow-lg shadow-purple-900/20 flex items-center gap-2">
                            <FolderOpen className="w-4 h-4" /> Mở Thư Mục
                        </button>
                        <button onClick={handleLoadProjectClick} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-blue-400 rounded-lg text-sm font-bold transition-colors border border-gray-700 flex items-center gap-2">
                            <Upload className="w-4 h-4" /> Mở JSON
                        </button>
                     </>
                )}

                {appState === AppState.REVIEW && (
                    <>
                        <button 
                            onClick={downloadAIEditsZip}
                            className="px-3 py-1.5 bg-gray-800 hover:bg-purple-900/50 text-purple-400 border border-gray-700 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                        >
                            <Sparkles className="w-4 h-4" />
                            <span className="hidden sm:inline">Tải AI Fix</span>
                        </button>

                        <div className="relative z-50">
                            <button 
                                onClick={() => setShowExportMenu(!showExportMenu)} 
                                className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-2 border border-gray-700"
                            >
                                <FolderDown className="w-4 h-4" />
                                <span className="hidden sm:inline">Xuất tất cả</span>
                                {showExportMenu ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>

                            {showExportMenu && (
                                <div className="absolute top-full right-0 mt-2 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-4 w-80 animate-in slide-in-from-top-2 z-[60] popup-menu space-y-3">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 border-b border-gray-800 pb-2">Tùy chọn xuất file</h4>
                                    <div className="space-y-3 mb-4">
                                        <label className="flex items-start gap-3 cursor-pointer group">
                                            <div className="relative flex items-center">
                                                <input type="checkbox" checked={exportOptions.includeSelected} onChange={e => setExportOptions({...exportOptions, includeSelected: e.target.checked})} className="peer h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500/50" />
                                            </div>
                                            <div className="flex-1">
                                                <span className="text-sm font-bold text-gray-200 group-hover:text-white">Ảnh gốc được chọn</span>
                                                <p className="text-[10px] text-gray-500">Xuất file gốc của các ảnh tốt nhất.</p>
                                            </div>
                                        </label>
                                        <label className="flex items-start gap-3 cursor-pointer group">
                                            <div className="relative flex items-center">
                                                <input type="checkbox" checked={exportOptions.includeEdited} onChange={e => setExportOptions({...exportOptions, includeEdited: e.target.checked})} className="peer h-4 w-4 rounded border-gray-600 bg-gray-800 text-purple-500 focus:ring-purple-500/50" />
                                            </div>
                                            <div className="flex-1">
                                                <span className="text-sm font-bold text-gray-200 group-hover:text-white">Ảnh đã chỉnh sửa (AI Fix)</span>
                                                <p className="text-[10px] text-gray-500">Xuất ảnh đã được AI xử lý.</p>
                                            </div>
                                        </label>
                                        {exportOptions.includeEdited && (
                                            <div className="ml-7 pl-3 border-l-2 border-gray-800 space-y-2">
                                                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="editedScope" checked={exportOptions.editedScope === 'all'} onChange={() => setExportOptions({...exportOptions, editedScope: 'all'})} className="text-purple-500 focus:ring-purple-500/50 bg-gray-800 border-gray-600" /><span className="text-xs text-gray-300">Tất cả ảnh đã sửa</span></label>
                                                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="editedScope" checked={exportOptions.editedScope === 'selected_only'} onChange={() => setExportOptions({...exportOptions, editedScope: 'selected_only'})} className="text-purple-500 focus:ring-purple-500/50 bg-gray-800 border-gray-600" /><span className="text-xs text-gray-300">Chỉ ảnh sửa được chọn</span></label>
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={handleExportZip} disabled={!exportOptions.includeSelected && !exportOptions.includeEdited} className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-lg text-sm font-bold transition-colors shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2">
                                        <Download className="w-4 h-4" /> Tải xuống .ZIP
                                    </button>
                                </div>
                            )}
                        </div>
                        <button onClick={() => { if(confirm("Tạo dự án mới? Mọi thay đổi chưa lưu sẽ bị mất.")) { resetProject(); }}} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-colors shadow-lg shadow-blue-900/20 flex items-center gap-2">
                            Dự án mới
                        </button>
                    </>
                )}
            </div>
        </header>
    );
};
