import { useState, useCallback, useRef } from 'react';

type DialogType = 'edit' | 'delete' | 'connection' | 'merge' | null;

interface DialogState {
    activeDialog: DialogType;
    pendingDialogs: DialogType[];
    isTransitioning: boolean;
}

export function useDialogManager() {
    const [state, setState] = useState<DialogState>({
        activeDialog: null,
        pendingDialogs: [],
        isTransitioning: false,
    });

    const transitionTimeoutRef = useRef<NodeJS.Timeout>();

    const openDialog = useCallback((dialogType: DialogType) => {
        setState(prev => {
            if (prev.activeDialog === dialogType) return prev;

            if (prev.activeDialog) {
                // 既にダイアログが開いている場合は、ペンディングに追加
                return {
                    ...prev,
                    pendingDialogs: [...prev.pendingDialogs, dialogType],
                };
            }

            return {
                ...prev,
                activeDialog: dialogType,
                isTransitioning: true,
            };
        });

        // トランジション完了後にフラグをリセット
        if (transitionTimeoutRef.current) {
            clearTimeout(transitionTimeoutRef.current);
        }
        transitionTimeoutRef.current = setTimeout(() => {
            setState(prev => ({ ...prev, isTransitioning: false }));
        }, 300); // Radix UIのアニメーション時間に合わせる
    }, []);

    const closeDialog = useCallback((dialogType: DialogType) => {
        setState(prev => {
            if (prev.activeDialog !== dialogType) return prev;

            const nextDialog = prev.pendingDialogs[0] || null;
            return {
                activeDialog: nextDialog,
                pendingDialogs: prev.pendingDialogs.slice(1),
                isTransitioning: !!nextDialog,
            };
        });
    }, []);

    const isDialogOpen = useCallback((dialogType: DialogType) => {
        return state.activeDialog === dialogType;
    }, [state.activeDialog]);

    const canOpenDialog = useCallback(() => {
        return !state.isTransitioning;
    }, [state.isTransitioning]);

    return {
        activeDialog: state.activeDialog,
        isTransitioning: state.isTransitioning,
        openDialog,
        closeDialog,
        isDialogOpen,
        canOpenDialog,
    };
} 