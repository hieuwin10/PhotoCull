
import React, { useState, useRef, useCallback } from 'react';
import { ImageGroup, ProcessedImage } from '../types';
import { analyzeImageGroup, refineImageGroup, mergeSimilarGroups, distributeImages, generateEnhancedImage, generateImageVariations, generateImprovementReport, getEditSuggestions } from '../services/geminiService';
import { resizeImageToBase64 } from '../services/imageUtils';
import { ProcessingStatus } from './useProcessingStatus';
import { downloadZip, getFormattedTimestamp } from '../services/downloadUtils';

export const useAIAnalysis = (
    groups: ImageGroup[],
    setGroups: React.Dispatch<React.SetStateAction<ImageGroup[]>>,
    groupsRef: React.MutableRefObject<ImageGroup[]>,
    setStatus: React.Dispatch<React.SetStateAction<ProcessingStatus | null>>,
    finishStatus: (taskName: string, msg: string, type?: 'success'|'info'|'error') => void
) => {
    const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false);
    const [isBatchEnhancing, setIsBatchEnhancing] = useState(false);
    const shouldStopBatchRef = useRef(false);
    
    // --- SINGLE GROUP ANALYSIS ---
    const handleAnalyzeGroup = useCallback(async (groupId: string, customPrompt?: string, skipLoadingState = false, groupOverride?: ImageGroup) => {
        // Find group
        const groupToAnalyze = groupOverride || groupsRef.current.find(g => g.id === groupId);
        
        if (!groupToAnalyze) {
            console.warn(`Group ${groupId} not found for analysis.`);
            return;
        }

        // Set UI to analyzing if not handled by batch
        if (!skipLoadingState) {
            setGroups(prev => prev.map(g => g.id === groupId ? { ...g, status: 'analyzing' } : g));
            // Show global status for single group analysis
            setStatus({ isActive: true, taskName: 'Phân tích nhóm', details: 'Đang gửi ảnh tới Gemini...', percent: 0, type: 'loading' });
        }
    
        try {
          const result = await analyzeImageGroup(groupToAnalyze.images, 3, customPrompt);
          
          // Check if the result implies a failure (Safe fallback from service)
          const isError = result.tags?.includes('Lỗi') || 
                          result.title?.includes('Lỗi') || 
                          result.title === 'Hết Quota' || 
                          result.title === 'Server Bận' || 
                          result.title === 'Sai API Key' ||
                          result.title === 'Lỗi Dữ Liệu';

          setGroups(prev => prev.map(g => {
            if (g.id !== groupId) return g;
            
            const bestIds = result.bestIndices
              .filter(idx => idx >= 0 && idx < g.images.length)
              .map(idx => g.images[idx].id);
    
            let updatedImages = [...g.images];
            if (result.imageInsights) {
                result.imageInsights.forEach(insight => {
                    if (insight.index >= 0 && insight.index < updatedImages.length) {
                        updatedImages[insight.index] = {
                            ...updatedImages[insight.index],
                            editSuggestions: insight.suggestions
                        };
                    }
                });
            }
    
            return {
              ...g,
              images: updatedImages,
              // IMPORTANT: If error, keep status as 'pending' so it stays in "Unfinished" list for next run
              status: isError ? 'pending' : 'done', 
              bestImageIds: bestIds,
              title: result.title,
              tags: result.tags,
              selectionReason: result.selectionReason,
              rejectionReason: result.rejectionReason,
              analyzedTimestamp: Date.now()
            };
          }));

          if (!skipLoadingState) {
              if (isError) {
                  finishStatus("Phân tích lỗi", "Không thể phân tích nhóm này.", 'error');
              } else {
                  finishStatus("Hoàn tất", "Đã phân tích xong nhóm.", 'success');
              }
          }

        } catch (error) {
          console.error("Analysis failed for", groupId, error);
          // Reset to pending on error so user can retry
          setGroups(prev => prev.map(g => g.id === groupId ? { ...g, status: 'pending' } : g));
          if (!skipLoadingState) finishStatus("Lỗi", "Đã xảy ra lỗi khi phân tích.", 'error');
          throw error; 
        }
      }, [groupsRef, setGroups, setStatus, finishStatus]);

    // --- STOP BATCH ANALYSIS ---
    const handleStopBatchAnalysis = useCallback(() => {
        if (isBatchAnalyzing || isBatchEnhancing) {
            shouldStopBatchRef.current = true;
            finishStatus("Đã dừng", "Đang dừng quá trình xử lý...", 'info');
        }
    }, [isBatchAnalyzing, isBatchEnhancing, finishStatus]);

    // --- QUICK ENHANCE SINGLE IMAGE (NEW) ---
    const handleEnhanceSingleImage = useCallback(async (image: ProcessedImage, groupId: string) => {
        // Find group to ensure valid state
        const group = groupsRef.current.find(g => g.id === groupId);
        if (!group) return;

        setStatus({
            isActive: true,
            taskName: "Magic Fix (1 ảnh)",
            details: `Đang xử lý: ${image.file.name}...`,
            percent: 0,
            type: 'loading'
        });

        try {
            // 1. Get Suggestions (if missing)
            let suggestions = image.editSuggestions;
            if (!suggestions || suggestions.length === 0) {
                 const res = await getEditSuggestions(image);
                 suggestions = res.suggestions;
            }

            // 2. Generate
            const newUrl = await generateEnhancedImage(image, suggestions);

            // 3. Report
            const originalBase64 = await resizeImageToBase64(image.file);
            const report = await generateImprovementReport(originalBase64, newUrl);

            // 4. Update State
            setGroups(prev => prev.map(g => {
                if (g.id !== groupId) return g;
                const newImages = g.images.map(img => {
                    if (img.id === image.id) {
                        return {
                            ...img,
                            editSuggestions: suggestions,
                            editedImageUrl: newUrl,
                            improvementDetails: report
                        };
                    }
                    return img;
                });
                return { ...g, images: newImages };
            }));

            finishStatus("Hoàn tất", "Đã tạo ảnh Magic Fix thành công.");
        } catch (e) {
            console.error(e);
            finishStatus("Lỗi", "Không thể tạo ảnh. Vui lòng thử lại.", 'error');
        }
    }, [groupsRef, setGroups, setStatus, finishStatus]);

    // --- BATCH ANALYSIS (Phân tích chọn ảnh) ---
    const handleBatchAnalyzeAll = useCallback(async (customPrompt?: string) => {
        if (isBatchAnalyzing) return;
        
        // Ensure we only pick up groups that are NOT done (including pending and possibly stuck analyzing)
        const initialPending = groupsRef.current.filter(g => g.status !== 'done');
        if (initialPending.length === 0) {
            finishStatus("Phân tích hàng loạt", "Tất cả các nhóm đã được phân tích.", 'info');
            return;
        }

        setIsBatchAnalyzing(true);
        shouldStopBatchRef.current = false;
        setStatus({ isActive: true, taskName: "Phân tích hàng loạt", details: `Đang chuẩn bị phân tích ${initialPending.length} nhóm...`, percent: 0, type: 'loading' });

        let processedCount = 0;
        const totalGroups = initialPending.length;

        // Track failed groups in THIS session to avoid infinite loop
        const failedGroupIds = new Set<string>();

        try {
            // Loop until no pending groups are left or stopped
            while (true) {
                if (shouldStopBatchRef.current) {
                    finishStatus("Đã dừng", `Đã dừng theo yêu cầu. (${processedCount} xong). Đang tải file kết quả...`, 'info');
                    break;
                }

                // Always get fresh pending list from ref
                // Exclude groups that already failed in this specific run to prevent infinite looping
                const currentPending = groupsRef.current.filter(g => g.status === 'pending' && !failedGroupIds.has(g.id));
                
                if (currentPending.length === 0) break;

                // SORTING PRIORITY: Failed/Error groups first (from previous sessions)
                currentPending.sort((a, b) => {
                    const aIsError = a.tags?.includes('Lỗi') || a.title?.includes('Lỗi');
                    const bIsError = b.tags?.includes('Lỗi') || b.title?.includes('Lỗi');
                    if (aIsError && !bIsError) return -1;
                    if (!aIsError && bIsError) return 1;
                    return 0;
                });

                // 1. Determine Batch Strategy
                const seedGroup = currentPending[0];
                const seedSize = seedGroup.images.length;
                let batchSizeLimit = 1;

                if (seedSize >= 5) batchSizeLimit = 2;
                else if (seedSize === 4) batchSizeLimit = 2;
                else if (seedSize === 3) batchSizeLimit = 3;
                else if (seedSize === 2) batchSizeLimit = 5;
                else batchSizeLimit = 10;

                // 2. Select groups for this batch
                const batch: ImageGroup[] = [seedGroup];
                for (let i = 1; i < currentPending.length; i++) {
                    if (batch.length >= batchSizeLimit) break;
                    const candidate = currentPending[i];
                    if (seedSize >= 5) {
                         if (candidate.images.length >= 5) batch.push(candidate);
                    } else if (candidate.images.length === seedSize) {
                        batch.push(candidate);
                    }
                }

                // 3. Update Status
                setStatus(prev => ({
                    ...prev!,
                    details: `Đang chạy Batch (${batch.length} nhóm size ~${seedSize})... [${processedCount}/${totalGroups}]`,
                    percent: (processedCount / totalGroups) * 100
                }));

                setGroups(prev => prev.map(g => batch.find(b => b.id === g.id) ? { ...g, status: 'analyzing' } : g));

                // 5. Execute Batch
                try {
                    await Promise.all(batch.map(g => handleAnalyzeGroup(g.id, customPrompt, true, g)));
                    processedCount += batch.length;
                    
                    // POST-BATCH CHECK: If any group is still 'pending' after execution, it means it failed logically (e.g. Quota).
                    // Add to failedGroupIds so we don't pick it up again in this loop.
                    const updatedGroups = groupsRef.current;
                    batch.forEach(g => {
                        const updatedG = updatedGroups.find(ug => ug.id === g.id);
                        if (updatedG && updatedG.status === 'pending') {
                            failedGroupIds.add(g.id);
                        }
                    });
                    
                    // Add throttling delay
                    await new Promise(r => setTimeout(r, 1000));

                } catch (batchError: any) {
                    console.error("Batch halted due to error:", batchError);
                    const msg = batchError.toString().toLowerCase();
                    
                    // IMPORTANT: Reset failed groups to 'pending' and mark them as Error
                    setGroups(prev => prev.map(g => {
                        if (batch.find(b => b.id === g.id)) {
                            // Track as failed to skip in next loop iteration
                            failedGroupIds.add(g.id);
                            
                            return {
                                ...g,
                                status: 'pending', // Reset status so it appears in pending list
                                title: `Lỗi: ${g.title || 'Nhóm'}`, // Visual indicator
                                tags: ['Lỗi', 'Ưu tiên'], // Used by sort logic above
                                selectionReason: `Lỗi: ${msg}`
                            };
                        }
                        return g;
                    }));

                    // Nếu gặp lỗi quá tải, dừng ngay lập tức và tải xuống
                    if (msg.includes('429') || msg.includes('400') || msg.includes('quota')) {
                         finishStatus("Lỗi API - Tự động lưu", "Hệ thống quá tải. Đang dừng và tải kết quả về máy...", 'error');
                         shouldStopBatchRef.current = true;
                         break;
                    }
                    
                    await new Promise(r => setTimeout(r, 3000));
                }
            }
            
            // --- AUTO DOWNLOAD LOGIC (Analyze Phase) ---
            if (processedCount > 0) {
                 setTimeout(() => {
                     downloadZip(
                         groupsRef.current, 
                         undefined, // projectJson
                         `PhotoCull_Analyzed_${getFormattedTimestamp()}.zip`
                     ).catch(err => console.error("Auto-save failed", err));
                 }, 1000);
            }

            if (!shouldStopBatchRef.current) {
                if (failedGroupIds.size > 0) {
                     finishStatus("Hoàn tất (Có lỗi)", `Đã phân tích xong. ${failedGroupIds.size} nhóm gặp lỗi đã được bỏ qua (vẫn ở mục Chưa Xong).`, 'info');
                } else {
                     finishStatus("Hoàn tất", `Đã phân tích xong ${processedCount} nhóm. File kết quả sẽ tự động tải xuống.`);
                }
            }

        } catch (error) {
            console.error("Batch Process Interrupted", error);
            finishStatus("Lỗi nghiêm trọng", "Quá trình bị gián đoạn.", 'error');
        } finally {
            setIsBatchAnalyzing(false);
            shouldStopBatchRef.current = false;
        }

    }, [groupsRef, isBatchAnalyzing, handleAnalyzeGroup, setStatus, finishStatus, setGroups]);


    // --- OTHER HELPERS (Refine, Merge, etc.) ---
    const handleRefineGroup = useCallback(async (groupId: string) => {
        setGroups(prev => prev.map(g => g.id === groupId ? { ...g, isRefining: true } : g));
        
        const group = groupsRef.current.find(g => g.id === groupId);
        if (!group) return;
    
        setStatus({ isActive: true, taskName: "Phân tách nhóm", details: "AI đang phân tích cấu trúc nhóm...", percent: 0, type: 'loading' });
    
        try {
            const subGroupIndices = await refineImageGroup(group.images);
    
            if (subGroupIndices.length <= 1) {
                 setGroups(prev => prev.map(g => g.id === groupId ? { ...g, isRefining: false } : g));
                 finishStatus("Phân tách nhóm", "Cấu trúc nhóm đã ổn định (AI không tìm thấy điểm cắt).", 'info');
                 return;
            }
    
            const newGroups: ImageGroup[] = subGroupIndices.map(indices => ({
                id: crypto.randomUUID(),
                images: indices.map(idx => group.images[idx]),
                status: 'pending',
                bestImageIds: [],
                title: subGroupIndices.length > 1 ? 'Đã tách nhóm (AI)' : undefined,
            }));
    
            setGroups(prev => {
                const index = prev.findIndex(g => g.id === groupId);
                if (index === -1) return prev;
                const copy = [...prev];
                copy.splice(index, 1, ...newGroups);
                return copy;
            });
    
            finishStatus("Phân tách nhóm", `Đã tách thành ${subGroupIndices.length} nhóm nhỏ.`);
    
        } catch (e) {
            console.error("Refine failed", e);
            setGroups(prev => prev.map(g => g.id === groupId ? { ...g, isRefining: false } : g));
            finishStatus("Phân tách nhóm", "Lỗi phân tích AI.", 'error');
        }
    }, [groupsRef, setGroups, setStatus, finishStatus]);

    const handleBatchRefine = useCallback(async () => {
        const candidateGroups = groupsRef.current.filter(g => g.images.length > 2);
        
        if (candidateGroups.length === 0) {
            finishStatus("AI Phân tách", "Không có nhóm nào cần phân tách (> 2 ảnh).", 'info');
            return;
        }
  
        if (!confirm(`AI sẽ quét ${candidateGroups.length} nhóm để tìm và tách các ảnh bị gom nhầm. Việc này có thể mất vài phút. Bạn có muốn tiếp tục?`)) return;
  
        setStatus({ isActive: true, taskName: "AI Phân tách", details: "Đang khởi tạo kết nối...", percent: 0, type: 'loading' });
  
        const CONCURRENCY = 1; 
        let completed = 0;
        let index = 0;
  
        const worker = async () => {
            while (true) {
                if (index >= candidateGroups.length) return;
                const group = candidateGroups[index++];
                
                setGroups(prev => prev.map(g => g.id === group.id ? { ...g, isRefining: true } : g));
                
                setStatus(prev => ({
                    ...prev!,
                    details: `[${completed + 1}/${candidateGroups.length}] Đang phân tích cấu trúc: ${group.title || 'Nhóm chưa đặt tên'}...`,
                    percent: (completed / candidateGroups.length) * 100
                }));
  
                try {
                    const subGroupIndices = await refineImageGroup(group.images);
                    
                    if (subGroupIndices.length > 1) {
                        const newGroups: ImageGroup[] = subGroupIndices.map(indices => ({
                          id: crypto.randomUUID(),
                          images: indices.map(idx => group.images[idx]),
                          status: 'pending',
                          bestImageIds: [],
                          title: 'Đã tách nhóm (AI)'
                        }));
  
                        setGroups(prev => {
                          const idx = prev.findIndex(g => g.id === group.id);
                          if (idx === -1) return prev;
                          const copy = [...prev];
                          copy.splice(idx, 1, ...newGroups);
                          return copy;
                        });
                    } else {
                        setGroups(prev => prev.map(g => g.id === group.id ? { ...g, isRefining: false } : g));
                    }
                } catch (e) {
                    console.error(`Error refining group ${group.id}`, e);
                    setGroups(prev => prev.map(g => g.id === group.id ? { ...g, isRefining: false } : g));
                } finally {
                    completed++;
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
        };
  
        await Promise.all(Array(Math.min(CONCURRENCY, candidateGroups.length)).fill(null).map(worker));
        
        finishStatus("AI Phân tách", `Đã xử lý xong ${candidateGroups.length} nhóm.`);
    }, [groupsRef, setGroups, setStatus, finishStatus]);

    const handleSmartMerge = useCallback(async () => {
        const SMALL_GROUP_THRESHOLD = 5;
        const smallGroups = groupsRef.current.filter(g => g.images.length <= SMALL_GROUP_THRESHOLD);

        if (smallGroups.length < 2) {
             finishStatus("Gộp nhóm thông minh", "Không đủ nhóm nhỏ để thực hiện gộp.", 'info');
             return;
         }
        
        setStatus({ isActive: true, taskName: "Gộp nhóm thông minh", details: "Đang phân tích sự tương đồng giữa các nhóm nhỏ...", percent: 0, type: 'loading' });

        try {
            // Pick representative image from each group
            const representatives = smallGroups.map(g => g.images[0]);
            
            const mergeClusters = await mergeSimilarGroups(representatives);
            
            if (mergeClusters.length === 0) {
                finishStatus("Gộp nhóm thông minh", "Không tìm thấy nhóm nào phù hợp để gộp.", 'info');
                return;
            }

            let mergedCount = 0;
            // Process clusters. Important: Process backwards or use IDs to avoid index shifting issues
            // mergeClusters is array of arrays of INDICES into 'smallGroups'
            
            setGroups(prev => {
                const newGroups = [...prev];
                const groupsToRemoveIds = new Set<string>();
                
                mergeClusters.forEach(clusterIndices => {
                    if (clusterIndices.length < 2) return;
                    
                    // Map cluster indices back to actual Group IDs
                    const groupsInCluster = clusterIndices.map(i => smallGroups[i]).filter(Boolean);
                    if (groupsInCluster.length < 2) return;

                    // Merge into the first group of the cluster
                    const primaryGroup = groupsInCluster[0];
                    const otherGroups = groupsInCluster.slice(1);
                    
                    // Update primary group
                    const primaryIndex = newGroups.findIndex(g => g.id === primaryGroup.id);
                    if (primaryIndex !== -1) {
                         const mergedImages = [...primaryGroup.images];
                         const mergedBestIds = [...primaryGroup.bestImageIds];
                         
                         otherGroups.forEach(og => {
                             mergedImages.push(...og.images);
                             mergedBestIds.push(...og.bestImageIds);
                             groupsToRemoveIds.add(og.id);
                         });
                         
                         // Sort images by time
                         mergedImages.sort((a,b) => a.file.lastModified - b.file.lastModified);

                         newGroups[primaryIndex] = {
                             ...newGroups[primaryIndex],
                             images: mergedImages,
                             bestImageIds: mergedBestIds,
                             title: `Đã gộp (${groupsInCluster.length} nhóm)`
                         };
                         mergedCount += otherGroups.length;
                    }
                });

                return newGroups.filter(g => !groupsToRemoveIds.has(g.id));
            });

            finishStatus("Gộp nhóm thông minh", `Đã gộp thành công ${mergedCount} nhóm nhỏ lại với nhau.`);

        } catch (e) {
             console.error("Smart Merge Failed", e);
             finishStatus("Gộp nhóm thông minh", "Lỗi phân tích AI.", 'error');
        }

    }, [groupsRef, setGroups, setStatus, finishStatus]);

    const handleSmartCleanup = useCallback(async () => {
         const isolateGroups = groupsRef.current.filter(g => g.images.length === 1);
         if (isolateGroups.length === 0) {
             finishStatus("Dọn dẹp ảnh lẻ", "Không có ảnh lẻ (nhóm 1 ảnh) nào.", 'info');
             return;
         }

         setStatus({ isActive: true, taskName: "Dọn dẹp ảnh lẻ", details: "Đang tìm vị trí phù hợp cho các ảnh lẻ...", percent: 0, type: 'loading' });

         let movedCount = 0;
         // Iterate through all groups to find isolates and check neighbors
         // We do this purely based on current order in groupsRef
         
         const actions: { imgId: string, targetGroupId: string }[] = [];

         // We'll process in chunks to show progress
         for (let i = 0; i < groupsRef.current.length; i++) {
             const group = groupsRef.current[i];
             if (group.images.length === 1) {
                 const prevGroup = i > 0 ? groupsRef.current[i-1] : null;
                 const nextGroup = i < groupsRef.current.length - 1 ? groupsRef.current[i+1] : null;
                 
                 // Skip if neighbors are also singletons (wait for merge step)
                 if ((!prevGroup || prevGroup.images.length === 1) && (!nextGroup || nextGroup.images.length === 1)) {
                     continue;
                 }

                 try {
                    const result = await distributeImages(
                        prevGroup ? prevGroup.images : [],
                        group.images,
                        nextGroup ? nextGroup.images : []
                    );

                    const action = result[0]; // 'PREV', 'NEXT', 'STAY'
                    
                    if (action === 'PREV' && prevGroup) {
                        actions.push({ imgId: group.images[0].id, targetGroupId: prevGroup.id });
                    } else if (action === 'NEXT' && nextGroup) {
                        actions.push({ imgId: group.images[0].id, targetGroupId: nextGroup.id });
                    }
                    
                 } catch (e) { console.error(e); }
             }
         }

         if (actions.length > 0) {
             setGroups(prev => {
                 const newGroups = [...prev];
                 
                 actions.forEach(({ imgId, targetGroupId }) => {
                     // Find source group (the singleton)
                     const sourceGroupIdx = newGroups.findIndex(g => g.images.length === 1 && g.images[0].id === imgId);
                     const targetGroupIdx = newGroups.findIndex(g => g.id === targetGroupId);
                     
                     if (sourceGroupIdx !== -1 && targetGroupIdx !== -1) {
                         const sourceGroup = newGroups[sourceGroupIdx];
                         const targetGroup = newGroups[targetGroupIdx];
                         const image = sourceGroup.images[0];
                         
                         // Move image
                         newGroups[targetGroupIdx] = {
                             ...targetGroup,
                             images: [...targetGroup.images, image].sort((a,b) => a.file.lastModified - b.file.lastModified)
                         };
                         
                         // Mark source for deletion
                         // (We can't delete in-place safely inside loop, so we'll filter later)
                         newGroups[sourceGroupIdx] = { ...sourceGroup, images: [] }; // Empty it
                     }
                 });
                 
                 return newGroups.filter(g => g.images.length > 0);
             });
             finishStatus("Dọn dẹp ảnh lẻ", `Đã di chuyển ${actions.length} ảnh lẻ vào các nhóm lân cận phù hợp.`);
         } else {
             finishStatus("Dọn dẹp ảnh lẻ", "Không tìm thấy nơi phù hợp để gộp ảnh lẻ.", 'info');
         }

    }, [groupsRef, setGroups, setStatus, finishStatus]);

    // --- BATCH EDIT (NEW: Supports Modes) ---
    const handleBatchEnhanceGroup = useCallback(async (groupId: string, mode: 'MAGIC' | 'VARIATIONS' = 'MAGIC') => {
        // Update group with batchAction type
        setGroups(prev => prev.map(g => g.id === groupId ? { ...g, isBatchEditing: true, batchAction: mode } : g));
        
        // Update Global Status
        setStatus({ 
            isActive: true, 
            taskName: mode === 'MAGIC' ? 'Magic Fix' : 'Tạo biến thể', 
            details: `Đang xử lý nhóm...`, 
            percent: 0, 
            type: 'loading' 
        });
        
        const group = groupsRef.current.find(g => g.id === groupId);
        if (!group) return;

        // Determine which images to edit: BEST images
        const imagesToEnhance = group.images.filter(img => group.bestImageIds.includes(img.id));
        
        if (imagesToEnhance.length === 0) {
             setGroups(prev => prev.map(g => g.id === groupId ? { ...g, isBatchEditing: false, batchAction: undefined } : g));
             finishStatus("Thông báo", "Không có ảnh nào được chọn (Best) trong nhóm này.", 'info');
             return;
        }

        try {
            // CONCURRENCY OPTIMIZATION: 
            // - Variations: Max 3 to fit within safe limits (3 input imgs * 4 vars = 12 requests < 15 RPM limit)
            // - Magic Fix: Max 5 as it is single request per image
            const BATCH_SIZE = mode === 'VARIATIONS' ? 3 : 5;
            const updates: ProcessedImage[] = [];

            for (let i = 0; i < imagesToEnhance.length; i += BATCH_SIZE) {
                const batch = imagesToEnhance.slice(i, i + BATCH_SIZE);
                
                // Update progress
                setStatus(prev => ({ 
                    ...prev!, 
                    details: `Đang xử lý ${batch.length} ảnh (${i}/${imagesToEnhance.length})...`, 
                    percent: (i / imagesToEnhance.length) * 100 
                }));

                // Process batch in parallel
                await Promise.all(batch.map(async (img) => {
                     // Skip if already has what we need
                    if (mode === 'MAGIC' && img.editedImageUrl) return;
                    if (mode === 'VARIATIONS' && img.variations && img.variations.length > 0) return;

                    try {
                        if (mode === 'MAGIC') {
                            // 1. Get Suggestions
                            const suggestionsData = await (img.editSuggestions ? Promise.resolve({ suggestions: img.editSuggestions }) : getEditSuggestions(img));
                            
                            // 2. Generate Image
                            const newUrl = await generateEnhancedImage(img, suggestionsData.suggestions);
                            
                            // 3. Generate Report
                            const originalBase64 = await resizeImageToBase64(img.file);
                            const report = await generateImprovementReport(originalBase64, newUrl);

                            updates.push({
                                ...img,
                                editSuggestions: suggestionsData.suggestions || img.editSuggestions,
                                editedImageUrl: newUrl,
                                improvementDetails: report
                            });
                        } else {
                            // VARIATIONS
                            const variations = await generateImageVariations(img);
                             updates.push({
                                ...img,
                                variations: variations,
                                editedImageUrl: variations.length > 0 ? variations[0] : img.editedImageUrl
                            });
                        }
                    } catch (e) {
                        console.error(`Failed to enhance ${img.file.name}`, e);
                    }
                }));
                
                // Add throttling delay between intra-group batches
                await new Promise(r => setTimeout(r, 2000));
            }
            
            if (updates.length > 0) {
                setGroups(prev => prev.map(g => {
                    if (g.id !== groupId) return g;
                    const newImages = g.images.map(img => {
                        const update = updates.find(u => u.id === img.id);
                        return update || img;
                    });
                    return { ...g, images: newImages, isBatchEditing: false, batchAction: undefined };
                }));
            } else {
                 setGroups(prev => prev.map(g => g.id === groupId ? { ...g, isBatchEditing: false, batchAction: undefined } : g));
            }
            
            finishStatus("Hoàn tất", `Đã xử lý xong ${updates.length} ảnh trong nhóm.`);

        } catch (e) {
            console.error("Batch Enhance Group Failed", e);
            setGroups(prev => prev.map(g => g.id === groupId ? { ...g, isBatchEditing: false, batchAction: undefined } : g));
            finishStatus("Lỗi", "Gặp sự cố khi xử lý ảnh.", 'error');
        }
    }, [groupsRef, setGroups, setStatus, finishStatus]);

    const handleBatchEnhanceAll = useCallback(async (
        modeOrPrompt: 'MAGIC' | 'VARIATIONS' | string = 'MAGIC',
        range?: { startGroupIndex: number; count: number }
    ) => {
        if (isBatchEnhancing) return;
        
        const mode: 'MAGIC' | 'VARIATIONS' = (modeOrPrompt === 'MAGIC' || modeOrPrompt === 'VARIATIONS') 
            ? modeOrPrompt as 'MAGIC' | 'VARIATIONS' 
            : 'MAGIC';
        
        const customPrompt = (modeOrPrompt !== 'MAGIC' && modeOrPrompt !== 'VARIATIONS') ? modeOrPrompt : undefined;

        const allGroups = groupsRef.current;
        let candidateGroups: ImageGroup[] = [];
        
        // 1. Filter based on Range provided OR default to all Done groups
        if (range) {
            // Ensure bounds
            const start = Math.max(0, range.startGroupIndex);
            const end = Math.min(allGroups.length, start + range.count);
            const slice = allGroups.slice(start, end);
            
            // Only take groups that are "done" and have best images picked within the range
            candidateGroups = slice.filter(g => g.status === 'done' && g.bestImageIds.length > 0);
        } else {
            candidateGroups = allGroups.filter(g => g.status === 'done' && g.bestImageIds.length > 0);
        }
        
        if (candidateGroups.length === 0) {
            finishStatus("Sửa ảnh hàng loạt", "Không có nhóm nào phù hợp trong phạm vi đã chọn.", 'info');
            return;
        }

        setIsBatchEnhancing(true);
        shouldStopBatchRef.current = false;
        setStatus({ isActive: true, taskName: `Sửa ảnh (${mode})`, details: "Đang khởi tạo...", percent: 0, type: 'loading' });

        // Flatten all tasks to allow cross-group parallelism
        interface Task {
            groupId: string;
            image: ProcessedImage;
        }
        
        const allTasks: Task[] = [];
        for (const group of candidateGroups) {
            // Mark group as editing with specific action
            setGroups(prev => prev.map(g => g.id === group.id ? { ...g, isBatchEditing: true, batchAction: mode } : g));
            
            const imagesToEnhance = group.images.filter(img => group.bestImageIds.includes(img.id));
            imagesToEnhance.forEach(img => {
                allTasks.push({ groupId: group.id, image: img });
            });
        }

        let processedCount = 0;
        const totalImages = allTasks.length;
        // CONCURRENCY INCREASE
        const BATCH_SIZE = mode === 'VARIATIONS' ? 3 : 5;
        
        try {
            for (let i = 0; i < allTasks.length; i += BATCH_SIZE) {
                if (shouldStopBatchRef.current) break;

                const batch = allTasks.slice(i, i + BATCH_SIZE);
                
                await Promise.all(batch.map(async (task) => {
                     if (shouldStopBatchRef.current) return;
                     
                     const { image, groupId } = task;
                     let update: ProcessedImage | null = null;
                     
                     try {
                        if (customPrompt) {
                             const newUrl = await generateEnhancedImage(image, [customPrompt]);
                             update = { ...image, editedImageUrl: newUrl, editSuggestions: [customPrompt] };
                        } else if (mode === 'MAGIC') {
                            if (!image.editedImageUrl) { 
                                const newUrl = await generateEnhancedImage(image, image.editSuggestions);
                                const originalBase64 = await resizeImageToBase64(image.file);
                                const report = await generateImprovementReport(originalBase64, newUrl);
                                update = { ...image, editedImageUrl: newUrl, improvementDetails: report };
                            }
                        } else {
                            // VARIATIONS
                            if (!image.variations || image.variations.length === 0) {
                                const vars = await generateImageVariations(image);
                                update = { ...image, variations: vars, editedImageUrl: vars[0] || image.editedImageUrl };
                            }
                        }
                    } catch (e) {
                        console.error(`Failed to enhance ${image.file.name}`, e);
                    } finally {
                        processedCount++;
                    }

                    // Apply update immediately if successful
                    if (update) {
                        const finalUpdate = update; // closure capture
                        setGroups(prev => prev.map(g => {
                            if (g.id !== groupId) return g;
                            const newImages = g.images.map(img => img.id === finalUpdate.id ? finalUpdate : img);
                            return { ...g, images: newImages };
                        }));
                    }
                }));

                // Update Status Bar
                setStatus(prev => ({
                    ...prev!,
                    details: `Đang xử lý song song ${BATCH_SIZE} ảnh... (${Math.min(processedCount, totalImages)}/${totalImages})`,
                    percent: (processedCount / totalImages) * 100
                }));
                
                // Add throttling delay between chunks
                await new Promise(r => setTimeout(r, 2000));
            }
            
            finishStatus("Sửa ảnh hàng loạt", "Đã hoàn tất quá trình chỉnh sửa.");

        } catch (e) {
            console.error(e);
            finishStatus("Sửa ảnh hàng loạt", "Gặp lỗi trong quá trình xử lý.", 'error');
        } finally {
            setIsBatchEnhancing(false);
            shouldStopBatchRef.current = false;
            // Clean up: Reset isBatchEditing for all involved groups
            setGroups(prev => prev.map(g => candidateGroups.find(c => c.id === g.id) ? { ...g, isBatchEditing: false, batchAction: undefined } : g));
        }

    }, [groupsRef, isBatchEnhancing, setGroups, setStatus, finishStatus]);

    return {
        isBatchAnalyzing,
        isBatchEnhancing,
        handleAnalyzeGroup,
        handleBatchAnalyzeAll,
        handleStopBatchAnalysis,
        handleRefineGroup,
        handleBatchRefine,
        handleSmartMerge,
        handleSmartCleanup,
        handleBatchEnhanceGroup,
        handleBatchEnhanceAll,
        handleEnhanceSingleImage
    };
};
