
import { useState, useRef, useEffect, useCallback } from 'react';
import { ImageGroup, ProcessedImage, TrashItem } from '../types';
import { urlManager } from '../services/urlManager';

export const useImageGroups = () => {
    const [groups, setGroups] = useState<ImageGroup[]>([]);
    const [trash, setTrash] = useState<TrashItem[]>([]);
    
    // Use a Ref to access the latest groups in callbacks without triggering re-renders
    const groupsRef = useRef<ImageGroup[]>(groups);
    useEffect(() => { groupsRef.current = groups; }, [groups]);

    // Update a specific image (e.g. after editing)
    const handleUpdateImage = useCallback((updatedImage: ProcessedImage) => {
        setGroups(prev => prev.map(group => {
            const imgIndex = group.images.findIndex(img => img.id === updatedImage.id);
            if (imgIndex === -1) return group;
            
            const newImages = [...group.images];
            // Safe merge: Ensure improvementDetails and other new fields are preserved
            newImages[imgIndex] = { ...newImages[imgIndex], ...updatedImage };
            return { ...group, images: newImages };
        }));
    }, []);

    // New: Batch update multiple images across groups
    const handleBatchUpdateImages = useCallback((updates: ProcessedImage[]) => {
        setGroups(prev => prev.map(group => {
            // Optimization: check if this group contains any of the updated images
            const relevantUpdates = updates.filter(u => group.images.some(i => i.id === u.id));
            if (relevantUpdates.length === 0) return group;

            const newImages = group.images.map(img => {
                const update = relevantUpdates.find(u => u.id === img.id);
                // Safe merge: Spread existing image properties then overwrite with update
                return update ? { ...img, ...update } : img;
            });
            return { ...group, images: newImages };
        }));
    }, []);

    const handleMoveImage = useCallback((groupId: string, imgId: string, direction: 'prev' | 'next') => {
        setGroups(prev => {
            const groupIdx = prev.findIndex(g => g.id === groupId);
            if (groupIdx === -1) return prev;
            
            const targetGroupIdx = direction === 'prev' ? groupIdx - 1 : groupIdx + 1;
            if (targetGroupIdx < 0 || targetGroupIdx >= prev.length) return prev;
  
            const group = prev[groupIdx];
            const image = group.images.find(i => i.id === imgId);
            if (!image) return prev;
  
            const newGroups = [...prev];
            
            // Remove from current
            newGroups[groupIdx] = {
                ...group,
                images: group.images.filter(i => i.id !== imgId),
                bestImageIds: group.bestImageIds.filter(id => id !== imgId)
            };
            
            // Add to target
            const targetGroup = newGroups[targetGroupIdx];
            newGroups[targetGroupIdx] = {
                ...targetGroup,
                images: [...targetGroup.images, image]
            };
  
            return newGroups;
        });
    }, []);

    const handleSplitGroup = useCallback((groupId: string, splitImageId: string) => {
        setGroups(prev => {
            const groupIdx = prev.findIndex(g => g.id === groupId);
            if (groupIdx === -1) return prev;
 
            const group = prev[groupIdx];
            const splitIndex = group.images.findIndex(i => i.id === splitImageId);
            if (splitIndex <= 0) return prev; // Can't split at start
 
            const firstPartImages = group.images.slice(0, splitIndex);
            const secondPartImages = group.images.slice(splitIndex);
 
            const newGroup1: ImageGroup = {
                ...group,
                images: firstPartImages,
                bestImageIds: group.bestImageIds.filter(id => firstPartImages.some(img => img.id === id))
            };
 
            const newGroup2: ImageGroup = {
                id: crypto.randomUUID(),
                images: secondPartImages,
                status: 'pending',
                bestImageIds: group.bestImageIds.filter(id => secondPartImages.some(img => img.id === id)),
                title: 'Nhóm mới tách'
            };
 
            const newGroups = [...prev];
            newGroups.splice(groupIdx, 1, newGroup1, newGroup2);
            return newGroups;
        });
    }, []);

    const handleMergeGroups = useCallback((index: number, direction: 'up' | 'down') => {
        setGroups(prev => {
            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            if (targetIndex < 0 || targetIndex >= prev.length) return prev;
  
            const group1 = direction === 'up' ? prev[targetIndex] : prev[index];
            const group2 = direction === 'up' ? prev[index] : prev[targetIndex];
  
            const mergedGroup: ImageGroup = {
                ...group1,
                images: [...group1.images, ...group2.images],
                bestImageIds: [...group1.bestImageIds, ...group2.bestImageIds],
                status: group1.status === 'done' && group2.status === 'done' ? 'done' : 'pending',
                title: group1.title // Keep title of top group
            };
  
            const newGroups = [...prev];
            // Remove both, insert merged at top index
            const removeIndex = direction === 'up' ? targetIndex : index;
            newGroups.splice(removeIndex, 2, mergedGroup);
            
            return newGroups;
        });
    }, []);

    const handleSortGroups = useCallback((criteria: 'time_desc' | 'time_asc' | 'size_desc' | 'size_asc' | 'name_asc') => {
        setGroups(prev => {
            const sorted = [...prev];
            sorted.sort((a, b) => {
                const imgA = a.images[0];
                const imgB = b.images[0];
                if (!imgA || !imgB) return 0;
                
                switch (criteria) {
                    case 'time_desc': // Newest first
                        return imgB.file.lastModified - imgA.file.lastModified;
                    case 'time_asc': // Oldest first
                        return imgA.file.lastModified - imgB.file.lastModified;
                    case 'size_desc': // Most images first
                        return b.images.length - a.images.length;
                    case 'size_asc': // Least images first
                        return a.images.length - b.images.length;
                    case 'name_asc': // Filename
                        return imgA.file.name.localeCompare(imgB.file.name);
                    default:
                        return 0;
                }
            });
            return sorted;
        });
    }, []);

    // --- TRASH FUNCTIONS ---

    const handleDeleteImage = useCallback((groupId: string, imageId: string) => {
        setGroups(prev => {
            const groupIndex = prev.findIndex(g => g.id === groupId);
            if (groupIndex === -1) return prev;

            const newGroups = [...prev];
            const group = newGroups[groupIndex];
            const imageToDelete = group.images.find(img => img.id === imageId);

            if (!imageToDelete) return prev;

            // Remove image from group
            newGroups[groupIndex] = {
                ...group,
                images: group.images.filter(img => img.id !== imageId),
                bestImageIds: group.bestImageIds.filter(id => id !== imageId)
            };

            // If group becomes empty, we should probably delete the group too, 
            // but for specific logic let's keep it empty or filter it out?
            // Let's filter out empty groups to avoid UI bugs
            if (newGroups[groupIndex].images.length === 0) {
                 newGroups.splice(groupIndex, 1);
            }

            // Add to Trash
            setTrash(t => [{
                id: crypto.randomUUID(),
                type: 'image',
                originalGroupId: group.id,
                data: imageToDelete,
                deletedAt: Date.now()
            }, ...t]);

            return newGroups;
        });
    }, []);

    const handleDeleteGroup = useCallback((groupId: string) => {
        setGroups(prev => {
            const groupIndex = prev.findIndex(g => g.id === groupId);
            if (groupIndex === -1) return prev;

            const groupToDelete = prev[groupIndex];
            const newGroups = [...prev];
            newGroups.splice(groupIndex, 1);

            // Add to Trash
            setTrash(t => [{
                id: crypto.randomUUID(),
                type: 'group',
                data: groupToDelete,
                deletedAt: Date.now()
            }, ...t]);

            return newGroups;
        });
    }, []);

    const handleRestoreFromTrash = useCallback((trashId: string) => {
        setTrash(prevTrash => {
            const itemIndex = prevTrash.findIndex(t => t.id === trashId);
            if (itemIndex === -1) return prevTrash;

            const item = prevTrash[itemIndex];
            const newTrash = [...prevTrash];
            newTrash.splice(itemIndex, 1);

            setGroups(prevGroups => {
                const newGroups = [...prevGroups];

                if (item.type === 'group') {
                    // Restore whole group. Add to the end (or we could try to put it back by index if we tracked it)
                    newGroups.push(item.data as ImageGroup);
                } else {
                    // Restore single image
                    const image = item.data as ProcessedImage;
                    const originalGroupId = item.originalGroupId;
                    
                    const targetGroupIndex = newGroups.findIndex(g => g.id === originalGroupId);
                    
                    if (targetGroupIndex !== -1) {
                        // Restore to original group
                        const group = newGroups[targetGroupIndex];
                        newGroups[targetGroupIndex] = {
                            ...group,
                            images: [...group.images, image]
                        };
                    } else {
                        // Original group gone? Create a "Restored" group
                        // Check if a "Restored" group already exists
                        const restoredGroupIndex = newGroups.findIndex(g => g.title === "Đã khôi phục");
                        
                        if (restoredGroupIndex !== -1) {
                             const rGroup = newGroups[restoredGroupIndex];
                             newGroups[restoredGroupIndex] = {
                                 ...rGroup,
                                 images: [...rGroup.images, image]
                             };
                        } else {
                            newGroups.push({
                                id: crypto.randomUUID(),
                                images: [image],
                                status: 'pending',
                                bestImageIds: [],
                                title: "Đã khôi phục",
                                tags: ["Restored"]
                            });
                        }
                    }
                }
                return newGroups;
            });

            return newTrash;
        });
    }, []);

    const handleEmptyTrash = useCallback(() => {
        if (confirm("Bạn có chắc chắn muốn xóa vĩnh viễn tất cả mục trong thùng rác? Hành động này không thể hoàn tác.")) {
            // Giải phóng ObjectURL để chống rò rỉ bộ nhớ
            trash.forEach(item => {
                if (item.type === 'image') {
                    const img = item.data as ProcessedImage;
                    urlManager.release(img.id);
                    if (img.editedImageUrl) urlManager.release(img.id + "_edited");
                    img.variations?.forEach((_, idx) => urlManager.release(img.id + "_var_" + (idx + 1)));
                } else if (item.type === 'group') {
                    const group = item.data as ImageGroup;
                    group.images.forEach(img => {
                        urlManager.release(img.id);
                        if (img.editedImageUrl) urlManager.release(img.id + "_edited");
                        img.variations?.forEach((_, idx) => urlManager.release(img.id + "_var_" + (idx + 1)));
                    });
                }
            });
            setTrash([]);
        }
    }, [trash]);

    return {
        groups,
        setGroups,
        groupsRef,
        trash,
        setTrash,
        handleUpdateImage,
        handleBatchUpdateImages,
        handleMoveImage,
        handleSplitGroup,
        handleMergeGroups,
        handleSortGroups,
        handleDeleteImage,
        handleDeleteGroup,
        handleRestoreFromTrash,
        handleEmptyTrash
    };
};
