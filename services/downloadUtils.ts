
import JSZip from 'jszip';
import { ImageGroup } from '../types';

/**
 * Generates a formatted timestamp string: HHhMMmSSs_DD-MM-YYYY
 * Example: 14h30m05s_25-10-2023
 */
export const getFormattedTimestamp = (): string => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    return `${h}h${m}m${s}s_${d}-${mo}-${y}`;
};

/**
 * Sanitizes a string to be safe for directory names.
 * Replaces invalid characters with underscores.
 */
const sanitizeFilename = (name: string): string => {
    return name.replace(/[<>:"/\\|?*]/g, '_').trim();
};

/**
 * Converts a Base64 Data URL to a Blob for zipping.
 */
const dataURItoBlob = async (dataURI: string): Promise<Blob> => {
    return await (await fetch(dataURI)).blob();
};

/**
 * Helper to split filename and extension
 */
const splitFileName = (fullFileName: string) => {
    const dotIndex = fullFileName.lastIndexOf('.');
    const name = dotIndex !== -1 ? fullFileName.substring(0, dotIndex) : fullFileName;
    const ext = dotIndex !== -1 ? fullFileName.substring(dotIndex) : '';
    return { name, ext };
};

/**
 * Helper to download text content as a file
 */
const downloadTextFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Creates a ZIP file containing ONLY the AI Enhanced images (and their variations).
 * Automatically downloads the latest JSON config as well.
 */
export const downloadAIEditsZip = async (
    groups: ImageGroup[], 
    projectJsonGenerator?: () => string,
    zipName?: string
) => {
    const finalZipName = zipName || `PhotoCull_AI_Edits_${getFormattedTimestamp()}.zip`;
    const zip = new JSZip();
    let hasContent = false;
    const folder = zip.folder("AI_Edits_Results");

    if (!folder) return;

    // Track filenames to prevent duplicates
    const usedNames = new Set<string>();

    for (const group of groups) {
        for (const img of group.images) {
            // Check if we have variations OR a single edited image
            const hasVariations = img.variations && img.variations.length > 0;
            const hasSingleEdit = !!img.editedImageUrl;

            if (hasVariations || hasSingleEdit) {
                hasContent = true;

                const { name, ext } = splitFileName(img.file.name);
                
                // SMART PREFIX CHECK:
                // If the file loaded from previous run already has "AI_Fix_", don't add it again.
                // This ensures "AI_Fix_Img.jpg" doesn't become "AI_Fix_AI_Fix_Img.jpg"
                const prefix = name.startsWith('AI_Fix_') ? '' : 'AI_Fix_';
                
                // Handle Base Filename Duplication
                let baseName = name;
                let counter = 1;
                while (usedNames.has(baseName)) {
                    baseName = `${name}_${counter}`;
                    counter++;
                }
                usedNames.add(baseName);

                try {
                    // Scenario A: Multiple Variations
                    if (hasVariations && img.variations) {
                        for (let i = 0; i < img.variations.length; i++) {
                            // CHECK IF USER SELECTED SPECIFIC INDICES
                            if (img.selectedVariationIndices && img.selectedVariationIndices.length > 0) {
                                if (!img.selectedVariationIndices.includes(i)) continue; // Skip unselected
                            }

                            const blob = await dataURItoBlob(img.variations[i]);
                            // Naming convention: AI_Fix_{filename}_Style_{i+1}.jpg
                            folder.file(`${prefix}${baseName}_Style_${i + 1}${ext}`, blob);
                        }
                    } 
                    // Scenario B: Single Edit (Magic Fix or Manual)
                    else if (img.editedImageUrl) {
                        const blob = await dataURItoBlob(img.editedImageUrl);
                        folder.file(`${prefix}${baseName}${ext}`, blob);
                        
                        // Add Report if available
                        if (img.improvementDetails) {
                             folder.file(`${prefix}${baseName}_Report.txt`, img.improvementDetails);
                        }
                    }
                } catch (e) {
                    console.error(`Failed to add enhanced image for ${baseName}`, e);
                }
            }
        }
    }

    if (!hasContent) {
        alert("Chưa có ảnh nào được AI chỉnh sửa. Vui lòng chạy tính năng 'Sửa ảnh hàng loạt' hoặc sửa thủ công trước.");
        return;
    }

    try {
        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = finalZipName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        
        // TRIGGER JSON DOWNLOAD SEPARATELY (As requested)
        if (projectJsonGenerator) {
            setTimeout(() => {
                const jsonContent = projectJsonGenerator();
                downloadTextFile(jsonContent, `PhotoCull_Project_Updated_${getFormattedTimestamp()}.json`);
            }, 1000);
        }

    } catch (error) {
        console.error("Error generating AI zip:", error);
        alert("Lỗi khi tạo file nén.");
    }
};

export interface ExportOptions {
    includeSelected: boolean;     // Export original files of Best Photos
    includeEdited: boolean;       // Export AI fixed images
    editedScope: 'all' | 'selected_only'; // 'all' = all edited images, 'selected_only' = only edited images that are also selected
}

/**
 * Creates a ZIP file containing folders for each group.
 * Each folder contains:
 * 1. Originals of Selected Images (Best Photos)
 * 2. AI Edited Images (Magic Fix/Variations) even if originally rejected but fixed by user
 * 3. Analysis Text Report
 */
export const downloadZip = async (
    groups: ImageGroup[], 
    projectJsonString?: string,
    zipName?: string,
    options?: ExportOptions,
    onProgress?: (percent: number, currentFile: string) => void
) => {
    // Default options
    const opts: ExportOptions = options || { 
        includeSelected: true, 
        includeEdited: true, 
        editedScope: 'all' 
    };

    const finalZipName = zipName || `PhotoCull_Export_${getFormattedTimestamp()}.zip`;
    const zip = new JSZip();
    let hasContent = false;
    let fileCount = 0;

    // 0. Add Project JSON if provided (Smart Backup)
    if (projectJsonString) {
        zip.file("photocull-project.json", projectJsonString);
    }

    // First pass: Calculate total files for accurate progress (approximation)
    const totalFilesToZip = groups.reduce((acc, g) => {
        if (g.status !== 'done') return acc;
        return acc + g.images.length * 2; // Rough estimate
    }, 0);

    // Use a sequential loop to handle async blob conversions nicely
    for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        
        // Skip unprocessed groups
        if (group.status !== 'done' && !group.images.some(img => img.editedImageUrl)) continue;

        // Construct folder name: "Nhom_1_TieuDe"
        const safeTitle = group.title ? sanitizeFilename(group.title) : '';
        const folderName = `Nhom_${i + 1}${safeTitle ? `_${safeTitle}` : ''}`;
        
        const folder = zip.folder(folderName);
        if (!folder) continue;
        
        // 1. Create Analysis Text File
        let analysisContent = "";
        if (group.title) {
            analysisContent += `TIÊU ĐỀ NHÓM: ${group.title}\n`;
            analysisContent += `==========================================\n\n`;
        }
        if (group.selectionReason) {
            analysisContent += `[+] LÝ DO CHỌN (AI):\n${group.selectionReason}\n\n`;
        }
        if (group.rejectionReason) {
            analysisContent += `[-] LÝ DO LOẠI (AI):\n${group.rejectionReason}\n\n`;
        }
        // Add individual image notes
        group.images.forEach(img => {
            if (img.editSuggestions && img.editSuggestions.length > 0) {
                 analysisContent += `> Ảnh ${img.file.name}: Gợi ý chỉnh sửa - ${img.editSuggestions.join(', ')}\n`;
            }
            if (img.improvementDetails) {
                 analysisContent += `> Ảnh ${img.file.name}: Báo cáo AI - ${img.improvementDetails}\n`;
            }
        });

        folder.file("phan_tich_AI.txt", analysisContent);
        
        // Track used filenames to prevent overwriting within the same group
        const usedNames = new Set<string>();

        // 2. Add Images
        for (const img of group.images) {
            const isSelected = group.bestImageIds.includes(img.id);
            const hasEdits = !!img.editedImageUrl || (img.variations && img.variations.length > 0);

            // LOGIC FOR EXPORTING
            const shouldExportOriginal = opts.includeSelected && isSelected;
            
            const shouldExportEdited = opts.includeEdited && hasEdits && 
                                       (opts.editedScope === 'all' || isSelected);

            if (shouldExportOriginal || shouldExportEdited) {
                hasContent = true;
                const { name, ext } = splitFileName(img.file.name);

                // Handle Filename Duplication
                let fileName = img.file.name;
                let baseName = name;
                if (usedNames.has(fileName)) {
                    let counter = 1;
                    while (usedNames.has(`${name}_${counter}${ext}`)) {
                        counter++;
                    }
                    baseName = `${name}_${counter}`;
                    fileName = `${baseName}${ext}`;
                }
                usedNames.add(fileName);

                // A. Add Original File
                if (shouldExportOriginal) {
                    folder.file(fileName, img.file);
                }

                // B. Add AI Enhanced Version(s)
                if (shouldExportEdited) {
                    // Smart Prefix Check
                    const prefix = baseName.startsWith('AI_Fix_') ? '' : 'AI_Fix_';

                    try {
                        const hasVariations = img.variations && img.variations.length > 0;
                        
                        // Scenario 1: Variations (Multiple Styles)
                        if (hasVariations && img.variations) {
                            for (let v = 0; v < img.variations.length; v++) {
                                // CHECK IF USER SELECTED SPECIFIC INDICES
                                if (img.selectedVariationIndices && img.selectedVariationIndices.length > 0) {
                                    if (!img.selectedVariationIndices.includes(v)) continue;
                                }

                                const blob = await dataURItoBlob(img.variations[v]);
                                folder.file(`${prefix}${baseName}_Style_${v + 1}${ext}`, blob);
                            }
                        } 
                        // Scenario 2: Single Edit (Magic Fix)
                        else if (img.editedImageUrl) {
                            const blob = await dataURItoBlob(img.editedImageUrl);
                            folder.file(`${prefix}${baseName}${ext}`, blob);
                            
                            // Report
                            if (img.improvementDetails) {
                                folder.file(`${prefix}${baseName}_Report.txt`, img.improvementDetails);
                            }
                        }
                    } catch (e) {
                        console.error(`Failed to add enhanced image for ${fileName}`, e);
                        analysisContent += `\n[ERROR] Không thể lưu ảnh AI_Fix cho ${fileName}`;
                    }
                }

                // Update Progress (Approximate)
                fileCount++;
                if (onProgress && totalFilesToZip > 0) {
                    const percent = Math.min(99, (fileCount / totalFilesToZip) * 100);
                    onProgress(percent, `Đang nén: ${fileName}`);
                }
            }
        }
    }
    
    if (!hasContent && !projectJsonString) {
        alert("Không có dữ liệu hợp lệ để tải xuống theo các tiêu chí đã chọn.");
        return;
    }

    try {
        if (onProgress) onProgress(99, "Đang tạo file ZIP...");
        
        const blob = await zip.generateAsync({ 
            type: 'blob',
            compression: "STORE", // Faster
            platform: "UNIX" 
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = finalZipName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        
        if (onProgress) onProgress(100, "Hoàn tất!");
    } catch (error) {
        console.error("Error generating zip:", error);
        alert("Đã xảy ra lỗi khi tạo file nén.");
        throw error;
    }
};
