
import React, { useState, useCallback, useRef } from 'react';
import JSZip from 'jszip';
import { AppState, ImageGroup, ProcessedImage, ProjectFile, SavedGroup, TrashItem, SavedTrashItem } from '../types';
import { groupSimilarImages } from '../services/imageUtils';
import { ProcessingStatus } from './useProcessingStatus';
import { getFormattedTimestamp } from '../services/downloadUtils';
import { urlManager } from '../services/urlManager';

export const useProjectManager = (
    groups: ImageGroup[],
    setGroups: React.Dispatch<React.SetStateAction<ImageGroup[]>>,
    setAppState: React.Dispatch<React.SetStateAction<AppState>>,
    setStatus: React.Dispatch<React.SetStateAction<ProcessingStatus | null>>,
    finishStatus: (taskName: string, msg: string, type?: 'success'|'info'|'error') => void,
    setFiles: React.Dispatch<React.SetStateAction<File[]>>,
    trash: TrashItem[],
    setTrash: React.Dispatch<React.SetStateAction<TrashItem[]>>
) => {
    const [progress, setProgress] = useState<{current: number, total: number} | null>(null);
    const [pendingProjectData, setPendingProjectData] = useState<ProjectFile | null>(null);
    
    // Store the directory handle to allow overwriting without re-prompting
    const dirHandleRef = useRef<any>(null);

    // Function to convert ImageGroup to SavedGroup
    const serializeGroup = (g: ImageGroup): SavedGroup => ({
        id: g.id,
        status: g.status,
        analyzedTimestamp: g.analyzedTimestamp,
        bestImageIds: g.bestImageIds,
        title: g.title,
        tags: g.tags,
        selectionReason: g.selectionReason,
        rejectionReason: g.rejectionReason,
        images: g.images.map(img => ({
            fileName: img.file.name,
            fileSize: img.file.size,
            id: img.id,
            hash: img.hash,
            isBest: img.isBest,
            reason: img.reason,
            editSuggestions: img.editSuggestions,
            improvementDetails: img.improvementDetails, // Save explanation
            editedImageUrl: img.editedImageUrl?.startsWith('data:') ? img.editedImageUrl : undefined,
            variations: img.variations?.filter(v => v.startsWith('data:')), // Save base64 variations if they exist in memory
            selectedVariationIndices: img.selectedVariationIndices // Save user selections
        }))
    });

    // Helper to split filename
    const splitFileName = (fullFileName: string) => {
        const dotIndex = fullFileName.lastIndexOf('.');
        const name = dotIndex !== -1 ? fullFileName.substring(0, dotIndex) : fullFileName;
        const ext = dotIndex !== -1 ? fullFileName.substring(dotIndex) : '';
        return { name, ext };
    };

    // Moved up to be accessible by other functions
    const handleRestoreProject = async (files: File[], projectData: ProjectFile) => {
          setStatus({ isActive: true, taskName: "Khôi phục dự án", details: "Đang ghép nối dữ liệu và ảnh đã sửa...", percent: 0, type: 'loading' });
          
          // Update global files state
          setFiles(files);
    
          // Create a map for fast file lookup: "filename" -> File
          const fileMap = new Map<string, File>();
          files.forEach(f => fileMap.set(f.name, f));
          
          // Helper to restore an image from saved meta
          const restoreImage = (savedImg: any): ProcessedImage | null => {
                const file = fileMap.get(savedImg.fileName);
                if (!file) return null;

                const url = urlManager.create(savedImg.id, file);
                
                // 1. Restore Main Edited Image (Magic Fix)
                let finalEditedUrl = savedImg.editedImageUrl;
                
                // Logic: If JSON doesn't contain the Base64 (because we saved to folder),
                // or even if it does, we prefer the 'live' file found in the folder scan if available.
                const { name, ext } = splitFileName(savedImg.fileName);
                
                // If original name already has AI_Fix, don't double up
                const prefix = name.startsWith('AI_Fix_') ? '' : 'AI_Fix_';
                
                const aiFixFileName = `${prefix}${name}${ext}`; 
                
                // Note: File extension matching might be tricky if AI changed it (e.g. Heic -> Jpg). 
                // But downloadUtils tries to keep extension or append it.
                // Let's look for exact match first, or try assuming .jpg if failed
                let aiFixFile = fileMap.get(aiFixFileName);
                
                // Fallback check: sometimes extension casing differs or was converted
                if (!aiFixFile && !name.startsWith('AI_Fix_')) {
                    aiFixFile = fileMap.get(`AI_Fix_${name}.jpg`) || fileMap.get(`AI_Fix_${name}.jpeg`);
                }
                
                if (aiFixFile) {
                    finalEditedUrl = urlManager.create(savedImg.id + "_edited", aiFixFile);
                }

                // 2. Restore Variations
                let restoredVariations: string[] = savedImg.variations || [];
                const foundVariations: string[] = [];
                
                // Try to find up to 10 style variations from file system
                for (let i = 1; i <= 10; i++) {
                    // Pattern from downloadUtils: AI_Fix_{baseName}_Style_{i}{ext}
                    const styleName = `${prefix}${name}_Style_${i}${ext}`;
                    let styleFile = fileMap.get(styleName);
                    
                    // Fallbacks
                    if (!styleFile && !name.startsWith('AI_Fix_')) {
                         styleFile = fileMap.get(`AI_Fix_${name}_Style_${i}.jpg`);
                    }

                    if (styleFile) {
                        foundVariations.push(urlManager.create(savedImg.id + "_var_" + i, styleFile));
                    } else {
                        // If we miss Style 1, likely no variations exist, stop looking
                        if (i === 1 && foundVariations.length === 0) break;
                    }
                }

                if (foundVariations.length > 0) {
                    restoredVariations = foundVariations;
                    
                    // CRITICAL FIX: If we found variations but have no primary edited URL set yet,
                    // we must pick one of the variations as the "Active" edited image so it shows in the UI.
                    if (!finalEditedUrl) {
                        // Priority: Pick the first one from user's selection list
                        if (savedImg.selectedVariationIndices && savedImg.selectedVariationIndices.length > 0) {
                             const firstSelectedIndex = savedImg.selectedVariationIndices[0];
                             // Ensure index is within bounds of what we actually restored
                             if (firstSelectedIndex < restoredVariations.length) {
                                 finalEditedUrl = restoredVariations[firstSelectedIndex];
                             } else {
                                 finalEditedUrl = restoredVariations[0];
                             }
                        } else {
                            // Default: Pick the first variation available
                            finalEditedUrl = restoredVariations[0];
                        }
                    }
                }

                return {
                    id: savedImg.id,
                    file: file,
                    previewUrl: url,
                    thumbnailUrl: url,
                    hash: savedImg.hash,
                    isBest: savedImg.isBest,
                    reason: savedImg.reason,
                    editSuggestions: savedImg.editSuggestions,
                    improvementDetails: savedImg.improvementDetails,
                    editedImageUrl: finalEditedUrl, 
                    variations: restoredVariations,
                    selectedVariationIndices: savedImg.selectedVariationIndices // Restore selection
                };
          };

          const restoredGroups: ImageGroup[] = [];
          let restoredCount = 0;
          let restoredEditsCount = 0;
    
          // 1. Restore Active Groups
          for (const savedG of projectData.groups) {
              const restoredImages: ProcessedImage[] = [];
              for (const savedImg of savedG.images) {
                  const img = restoreImage(savedImg);
                  if (img) {
                      restoredImages.push(img);
                      if (img.editedImageUrl || (img.variations && img.variations.length > 0)) {
                          restoredEditsCount++;
                      }
                  }
              }
    
              if (restoredImages.length > 0) {
                  let safeStatus = savedG.status;
                  if (safeStatus === 'analyzing') safeStatus = 'pending';
    
                  restoredGroups.push({
                      id: savedG.id,
                      images: restoredImages,
                      status: safeStatus,
                      analyzedTimestamp: savedG.analyzedTimestamp,
                      bestImageIds: savedG.bestImageIds,
                      title: savedG.title,
                      tags: savedG.tags,
                      selectionReason: savedG.selectionReason,
                      rejectionReason: savedG.rejectionReason,
                  });
                  restoredCount += restoredImages.length;
              }
          }

          // 2. Restore Trash (If available)
          const restoredTrash: TrashItem[] = [];
          if (projectData.trash) {
              for (const item of projectData.trash) {
                  if (item.type === 'image') {
                      const imgMeta = item.data as any; // SavedImageMeta
                      const restoredImg = restoreImage(imgMeta);
                      if (restoredImg) {
                          restoredTrash.push({
                              id: item.id,
                              type: 'image',
                              originalGroupId: item.originalGroupId,
                              deletedAt: item.deletedAt,
                              data: restoredImg
                          });
                      }
                  } else if (item.type === 'group') {
                      const groupMeta = item.data as SavedGroup;
                      const restoredImages: ProcessedImage[] = [];
                      for (const savedImg of groupMeta.images) {
                          const img = restoreImage(savedImg);
                          if (img) restoredImages.push(img);
                      }
                      if (restoredImages.length > 0) {
                          restoredTrash.push({
                              id: item.id,
                              type: 'group',
                              deletedAt: item.deletedAt,
                              data: {
                                  ...groupMeta,
                                  images: restoredImages,
                                  // Map back to ImageGroup structure
                                  bestImageIds: groupMeta.bestImageIds,
                                  status: groupMeta.status
                              } as ImageGroup
                          });
                      }
                  }
              }
          }
    
          setGroups(restoredGroups);
          setTrash(restoredTrash);
          setAppState(AppState.REVIEW);
          finishStatus("Khôi phục dự án", `Đã tải ${restoredGroups.length} nhóm, ${restoredCount} ảnh (${restoredEditsCount} ảnh đã sửa).`);
    };

    const handleFilesSelected = async (newFiles: File[]) => {
        // Clear previous session URLs to prevent memory leaks
        urlManager.revokeAll();

        // If we have pending project data (Restoring session from Legacy Load)
        if (pendingProjectData) {
            handleRestoreProject(newFiles, pendingProjectData);
            setPendingProjectData(null);
            return;
        }
    
        setFiles(newFiles);
        setAppState(AppState.GROUPING);
        
        // Defer processing to next tick to allow UI to update
        setTimeout(async () => {
          try {
            // Sắp xếp file theo tên (numeric: true để IMG_2 trước IMG_10)
            const sortedFiles = [...newFiles].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
            
            const groupedImages = await groupSimilarImages(sortedFiles, (current, total) => {
              setProgress({ current, total });
            });
    
            // SORTING BY DEFAULT: Largest groups first (Most images)
            groupedImages.sort((a, b) => b.images.length - a.images.length);
    
            setGroups(groupedImages);
            setAppState(AppState.REVIEW);
          } catch (error) {
            console.error("Grouping failed", error);
            alert("Xử lý ảnh thất bại. Vui lòng thử lại với số lượng ít hơn.");
            setAppState(AppState.UPLOAD);
          } finally {
            setProgress(null);
          }
        }, 100);
      };

    const getProjectDataBlob = useCallback(() => {
          const savedGroups: SavedGroup[] = groups.map(serializeGroup);
          
          const savedTrash: SavedTrashItem[] = trash.map(t => {
              let serializedData;
              if (t.type === 'group') {
                  serializedData = serializeGroup(t.data as ImageGroup);
              } else {
                  // Manually serialize single image using same logic as serializeGroup
                  const img = t.data as ProcessedImage;
                  serializedData = {
                      fileName: img.file.name,
                      fileSize: img.file.size,
                      id: img.id,
                      hash: img.hash,
                      isBest: img.isBest,
                      reason: img.reason,
                      editSuggestions: img.editSuggestions,
                      improvementDetails: img.improvementDetails, // Save explanation
                      editedImageUrl: img.editedImageUrl?.startsWith('data:') ? img.editedImageUrl : undefined,
                      variations: img.variations?.filter(v => v.startsWith('data:')),
                      selectedVariationIndices: img.selectedVariationIndices
                  };
              }

              return {
                  id: t.id,
                  type: t.type,
                  originalGroupId: t.originalGroupId,
                  deletedAt: t.deletedAt,
                  data: serializedData
              } as SavedTrashItem;
          });
    
          const projectData: ProjectFile = {
              version: "1.3", // Bump version
              timestamp: Date.now(),
              groups: savedGroups,
              trash: savedTrash
          };
          
          return JSON.stringify(projectData, null, 2);
    }, [groups, trash]);

    // Legacy JSON Download
    const handleSaveProject = useCallback(() => {
          const jsonString = getProjectDataBlob();
          const blob = new Blob([jsonString], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `PhotoCull_Project_${getFormattedTimestamp()}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
    }, [getProjectDataBlob]);

    // Save to Folder (Overwrite if possible)
    const handleSaveProjectToFolder = useCallback(async () => {
        try {
            // @ts-ignore
            if (!window.showDirectoryPicker) throw new Error("API not supported");

            let dirHandle = dirHandleRef.current;

            // If we don't have a handle yet, ask for one
            if (!dirHandle) {
                // @ts-ignore - File System Access API
                dirHandle = await window.showDirectoryPicker();
                if (!dirHandle) return;
                dirHandleRef.current = dirHandle; // Save for next time
            }

            // Verify Permissions for Writing
            // @ts-ignore
            if (dirHandle.queryPermission) {
                 // @ts-ignore
                 const options = { mode: 'readwrite' };
                 // @ts-ignore
                 if ((await dirHandle.queryPermission(options)) !== 'granted') {
                     // @ts-ignore
                     if ((await dirHandle.requestPermission(options)) !== 'granted') {
                         alert("Bạn cần cấp quyền Ghi (Write) để lưu đè file vào thư mục này.");
                         return;
                     }
                 }
            }

            setStatus({ isActive: true, taskName: "Lưu dự án", details: "Đang chuẩn bị dữ liệu...", percent: 10, type: 'loading' });

            // 1. Create/Overwrite project JSON file
            setStatus(prev => ({ ...prev!, details: "Đang ghi file cấu hình JSON...", percent: 20 }));
            const fileHandle = await dirHandle.getFileHandle('photocull-project.json', { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(getProjectDataBlob());
            await writable.close();

            // 2. Save AI Edited Images to 'AI_Edits' subfolder
            setStatus(prev => ({ ...prev!, details: "Đang kiểm tra ảnh đã chỉnh sửa...", percent: 40 }));
            
            let savedCount = 0;
            // Identify all images with edits (Both in Active Groups AND in Trash)
            const imagesToSave: { filename: string, dataUrl: string, report?: string }[] = [];
            
            const scanImageForEdits = (img: ProcessedImage) => {
                const { name, ext } = splitFileName(img.file.name);
                
                // SMART PREFIX: Avoid AI_Fix_AI_Fix_...
                const prefix = name.startsWith('AI_Fix_') ? '' : 'AI_Fix_';

                // Add Main Edit
                if (img.editedImageUrl) {
                    imagesToSave.push({
                        filename: `${prefix}${name}${ext}`,
                        dataUrl: img.editedImageUrl,
                        report: img.improvementDetails
                    });
                }
                
                // Add Variations
                if (img.variations && img.variations.length > 0) {
                    img.variations.forEach((varUrl, idx) => {
                         imagesToSave.push({
                             filename: `${prefix}${name}_Style_${idx+1}${ext}`,
                             dataUrl: varUrl
                         });
                    });
                }
            };

            groups.forEach(group => group.images.forEach(scanImageForEdits));
            
            // Also scan trash
            trash.forEach(item => {
                if (item.type === 'image') {
                    scanImageForEdits(item.data as ProcessedImage);
                } else if (item.type === 'group') {
                    (item.data as ImageGroup).images.forEach(scanImageForEdits);
                }
            });

            if (imagesToSave.length > 0) {
                 // Create subfolder
                 const editsDirHandle = await dirHandle.getDirectoryHandle('AI_Edits', { create: true });
                 
                 for (let i = 0; i < imagesToSave.length; i++) {
                     const item = imagesToSave[i];
                     const percent = 40 + Math.round(((i + 1) / imagesToSave.length) * 60);
                     
                     setStatus(prev => ({ 
                         ...prev!, 
                         details: `Đang lưu ảnh: ${item.filename} (${i+1}/${imagesToSave.length})...`, 
                         percent: percent 
                     }));

                     try {
                         // Convert Data URL to Blob
                         const response = await fetch(item.dataUrl);
                         const blob = await response.blob();
                         
                         const imgFileHandle = await editsDirHandle.getFileHandle(item.filename, { create: true });
                         const imgWritable = await imgFileHandle.createWritable();
                         await imgWritable.write(blob);
                         await imgWritable.close();
                         
                         // Save Report if exists
                         if (item.report) {
                            const reportName = `${item.filename}_Report.txt`; // Simple append
                            const txtFileHandle = await editsDirHandle.getFileHandle(reportName, { create: true });
                            const txtWritable = await txtFileHandle.createWritable();
                            await txtWritable.write(item.report);
                            await txtWritable.close();
                         }

                         savedCount++;
                     } catch (e) {
                         console.error(`Failed to save image ${item.filename}`, e);
                     }
                 }
            }

            finishStatus("Lưu dự án", `Đã lưu file JSON và ${savedCount} ảnh đã sửa vào thư mục.`);
        } catch (err: any) {
            console.error(err);
            // Check for Security/Cross-Origin errors typical in iframes/sandboxes
            const isSecurityError = err.name === 'SecurityError' || err.message?.includes('Cross origin') || err.message === 'API not supported';
            
            if (isSecurityError) {
                finishStatus("Chế độ tải xuống", "Trình duyệt chặn ghi đè trực tiếp trong môi trường này. Đang tải file...", 'info');
                handleSaveProject();
                return;
            }

            if (err.name !== 'AbortError') {
                alert("Lỗi khi lưu vào thư mục: " + err.message);
                setStatus(null);
            } else {
                setStatus(null);
            }
        }
    }, [getProjectDataBlob, setStatus, finishStatus, handleSaveProject, groups, trash]);

    // Legacy JSON Load
    const handleLoadProjectClick = useCallback(() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'application/json';
          input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (!file) return;
    
              const reader = new FileReader();
              reader.onload = (ev) => {
                  try {
                      const content = ev.target?.result as string;
                      const data = JSON.parse(content) as ProjectFile;
                      if (!data.groups) throw new Error("Invalid project file");
                      
                      setPendingProjectData(data);
                      setAppState(AppState.UPLOAD);
                      alert("Đã tải dữ liệu dự án. Vui lòng chọn (hoặc kéo thả) lại thư mục ảnh gốc để khôi phục hoàn toàn.");
                  } catch (err) {
                      alert("File dự án không hợp lệ.");
                  }
              };
              reader.readAsText(file);
          };
          input.click();
    }, [setAppState]);

    // NEW: Helper to scan directories recursively
    const getFilesRecursively = async (entry: any): Promise<File[]> => {
        const files: File[] = [];
        // entry might be the directory handle itself
        const handle = entry; 
        
        for await (const item of handle.values()) {
             if (item.kind === 'file') {
                 try {
                     const file = await item.getFile();
                     files.push(file);
                 } catch (e) { console.warn("Skipped file", e); }
             } else if (item.kind === 'directory') {
                 // Recurse
                 files.push(...await getFilesRecursively(item));
             }
        }
        return files;
    };

    // NEW: Helper to unzip files found in the list WITH SMART MERGING
    const expandZipContent = async (files: File[]): Promise<File[]> => {
        const result: File[] = [];
        const zipFiles = files.filter(f => f.name.toLowerCase().endsWith('.zip'));
        const normalFiles = files.filter(f => !f.name.toLowerCase().endsWith('.zip'));
        
        // 1. Add normal files first - These are the Source of Truth (Originals)
        result.push(...normalFiles);
        
        // Create a set of existing filenames to avoid duplicates from ZIP (only for originals)
        const existingNames = new Set(normalFiles.map(f => f.name));

        if (zipFiles.length > 0) {
            setStatus({ isActive: true, taskName: "Giải nén ZIP", details: `Tìm thấy ${zipFiles.length} file zip. Đang kiểm tra...`, percent: 0, type: 'loading' });
            
            for (let i = 0; i < zipFiles.length; i++) {
                const zipFile = zipFiles[i];
                setStatus(prev => ({...prev!, details: `Đang đọc zip: ${zipFile.name}...`, percent: (i/zipFiles.length)*100 }));
                try {
                    const zip = await JSZip.loadAsync(zipFile);
                    const entries: Promise<void>[] = [];
                    
                    zip.forEach((relativePath, entry) => {
                         if (!entry.dir) {
                             const lowerName = entry.name.toLowerCase();
                             
                             // Skip system files
                             if (lowerName.includes('__macosx') || lowerName.includes('ds_store')) return;

                             if (lowerName.match(/\.(jpg|jpeg|png|webp|heic|json)$/i)) {
                                 // FLATTEN: Remove folders by taking only the filename
                                 const fileName = entry.name.split('/').pop() || entry.name;
                                 
                                 // LOGIC:
                                 // 1. Keep 'photocull-project.json'
                                 // 2. Keep 'AI_Fix_...' files (These are edited assets, not duplicates)
                                 // 3. Keep Original Images ONLY if they are not already on disk.
                                 const isProjectFile = fileName.toLowerCase() === 'photocull-project.json';
                                 const isAIEdit = fileName.startsWith('AI_Fix_') || fileName.includes('AI_Fix_');

                                 if (isProjectFile || isAIEdit || !existingNames.has(fileName)) {
                                    entries.push((async () => {
                                        const blob = await entry.async('blob');
                                        const file = new File([blob], fileName, { type: blob.type });
                                        result.push(file);
                                    })());
                                 }
                             }
                         }
                    });
                    
                    await Promise.all(entries);
                } catch (e) {
                    console.warn("Skipped bad zip", zipFile.name);
                }
            }
        }
        return result;
    };

    // Helper to process files from either API or Input Fallback
    const processProjectFiles = useCallback(async (rawFiles: File[]) => {
        // 1. Unzip any zip files found (Recursive & Deduplicated)
        const files = await expandZipContent(rawFiles);

        let projectJson: ProjectFile | null = null;
        const validFiles: File[] = [];

        // 2. Search for JSON and Images
        for (const file of files) {
            if (file.name.toLowerCase().endsWith('.json')) {
                try {
                    const text = await file.text();
                    const json = JSON.parse(text);
                    if (json.version && Array.isArray(json.groups)) {
                        projectJson = json as ProjectFile;
                    }
                } catch (e) {
                    console.warn(`Found .json file ${file.name} but it was not a valid project file.`);
                }
            } else if (file.name.match(/\.(jpg|jpeg|png|webp|heic)$/i)) {
                validFiles.push(file);
            }
        }

        // 3. Decide Action
        if (projectJson) {
            // Restore from JSON
            setStatus({ isActive: true, taskName: "Khôi phục dự án", details: "Đang đồng bộ dữ liệu từ file JSON...", percent: 50, type: 'loading' });
            await handleRestoreProject(validFiles, projectJson);
        } else {
            // New Project
            if (validFiles.length > 0) {
                 finishStatus("Mở thư mục", `Tìm thấy ${validFiles.length} ảnh. Đang bắt đầu dự án mới...`, 'info');
                 setPendingProjectData(null); 
                 handleFilesSelected(validFiles);
            } else {
                 finishStatus("Thư mục trống", "Không tìm thấy ảnh hoặc file dự án.", 'error');
            }
        }
    }, [handleRestoreProject, handleFilesSelected, setStatus, finishStatus]);

    // Open Project Folder with Fallback
    const handleOpenProjectFolder = useCallback(async () => {
        try {
            // @ts-ignore
            if (!window.showDirectoryPicker) throw new Error("API not supported");

            // @ts-ignore - File System Access API
            const dirHandle = await window.showDirectoryPicker();
            if (!dirHandle) return;
            
            // Store handle for future Saves
            dirHandleRef.current = dirHandle;

            setStatus({ isActive: true, taskName: "Quét thư mục", details: "Đang quét toàn bộ thư mục (bao gồm thư mục con AI_Edits)...", percent: 0, type: 'loading' });

            // RECURSIVE SCAN
            const files = await getFilesRecursively(dirHandle);
            
            await processProjectFiles(files);

        } catch (err: any) {
             const isSecurityError = err.name === 'SecurityError' || err.message?.includes('Cross origin') || err.message === 'API not supported';

             if (isSecurityError) {
                // FALLBACK: Use <input type="file" webkitdirectory>
                const input = document.createElement('input');
                input.type = 'file';
                input.multiple = true;
                input.setAttribute('webkitdirectory', '');
                input.setAttribute('directory', ''); // Non-standard fallback
                input.style.display = 'none';
                
                input.onchange = async (e) => {
                    const fileList = (e.target as HTMLInputElement).files;
                    if (fileList && fileList.length > 0) {
                        setStatus({ isActive: true, taskName: "Quét thư mục (Legacy)", details: "Đang đọc dữ liệu...", percent: 0, type: 'loading' });
                        const files = Array.from(fileList);
                        await processProjectFiles(files);
                    }
                };
                
                document.body.appendChild(input);
                input.click();
                setTimeout(() => document.body.removeChild(input), 1000);
                return;
             }

             if (err.name !== 'AbortError') {
                console.error(err);
                alert("Không thể truy cập thư mục: " + err.message);
                setStatus(null);
            } else {
                setStatus(null);
            }
        }
    }, [processProjectFiles, setStatus, finishStatus]);

    const resetProject = useCallback(() => {
        urlManager.revokeAll();
        setGroups([]);
        setFiles([]);
        setTrash([]);
        setAppState(AppState.UPLOAD);
    }, [setGroups, setFiles, setTrash, setAppState]);

    return {
        progress,
        pendingProjectData,
        handleFilesSelected,
        handleSaveProject,
        handleSaveProjectToFolder,
        handleLoadProjectClick,
        handleOpenProjectFolder,
        generateProjectJson: getProjectDataBlob,
        resetProject, // Exported
    };
};
