
import { useState, useCallback } from 'react';

export interface ProcessingStatus {
    isActive: boolean;
    taskName: string; // "Batch Analyze", "Smart Merge", etc.
    details: string; // "Processing Group 1/5", "Compressing file.jpg"
    percent: number; // 0-100
    type: 'loading' | 'success' | 'error' | 'info';
}

export const useProcessingStatus = () => {
    const [status, setStatus] = useState<ProcessingStatus | null>(null);

    const finishStatus = useCallback((taskName: string, successMessage: string = "Hoàn tất!", type: 'success' | 'info' | 'error' = 'success') => {
        setStatus({ isActive: false, taskName, details: successMessage, percent: 100, type });
        setTimeout(() => setStatus(null), 4000);
    }, []);

    return {
        status,
        setStatus,
        finishStatus
    };
};
