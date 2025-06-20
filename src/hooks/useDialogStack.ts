import { useState, useCallback, useMemo } from 'react';

export interface DialogStackItem {
  id: string;
  component?: string;
  data?: any;
  timestamp: number;
}

export interface UseDialogStackResult {
  stack: DialogStackItem[];
  currentDialog: DialogStackItem | null;
  push: (dialogId: string, component?: string, data?: any) => void;
  pop: () => DialogStackItem | null;
  remove: (dialogId: string) => void;
  clear: () => void;
  isOpen: (dialogId: string) => boolean;
  canClose: (dialogId: string) => boolean;
  getDialogData: (dialogId: string) => any;
  replaceTop: (dialogId: string, component?: string, data?: any) => void;
}

export function useDialogStack(): UseDialogStackResult {
  const [stack, setStack] = useState<DialogStackItem[]>([]);

  const currentDialog = useMemo(() => {
    return stack.length > 0 ? stack[stack.length - 1] : null;
  }, [stack]);

  const push = useCallback((dialogId: string, component?: string, data?: any) => {
    const item: DialogStackItem = {
      id: dialogId,
      component,
      data,
      timestamp: Date.now(),
    };

    setStack(prev => {
      // 既に同じIDのダイアログがスタックにある場合は、それを削除してから追加
      const filtered = prev.filter(item => item.id !== dialogId);
      return [...filtered, item];
    });
  }, []);

  const pop = useCallback((): DialogStackItem | null => {
    let poppedItem: DialogStackItem | null = null;
    
    setStack(prev => {
      if (prev.length === 0) return prev;
      
      poppedItem = prev[prev.length - 1];
      return prev.slice(0, -1);
    });
    
    return poppedItem;
  }, []);

  const remove = useCallback((dialogId: string) => {
    setStack(prev => prev.filter(item => item.id !== dialogId));
  }, []);

  const clear = useCallback(() => {
    setStack([]);
  }, []);

  const isOpen = useCallback((dialogId: string): boolean => {
    return stack.some(item => item.id === dialogId);
  }, [stack]);

  const canClose = useCallback((dialogId: string): boolean => {
    // ダイアログは、スタックの最上位の場合のみ閉じることができる
    return stack.length > 0 && stack[stack.length - 1].id === dialogId;
  }, [stack]);

  const getDialogData = useCallback((dialogId: string): any => {
    const dialog = stack.find(item => item.id === dialogId);
    return dialog?.data;
  }, [stack]);

  const replaceTop = useCallback((dialogId: string, component?: string, data?: any) => {
    setStack(prev => {
      if (prev.length === 0) {
        // スタックが空の場合は新しいダイアログを追加
        return [{
          id: dialogId,
          component,
          data,
          timestamp: Date.now(),
        }];
      }

      // 最上位のダイアログを置き換え
      const newStack = [...prev];
      newStack[newStack.length - 1] = {
        id: dialogId,
        component,
        data,
        timestamp: Date.now(),
      };
      return newStack;
    });
  }, []);

  return {
    stack,
    currentDialog,
    push,
    pop,
    remove,
    clear,
    isOpen,
    canClose,
    getDialogData,
    replaceTop,
  };
}

// 特定のダイアログタイプのための便利フック
export function useSpecificDialog(dialogId: string) {
  const dialogStack = useDialogStack();

  const open = useCallback((component?: string, data?: any) => {
    dialogStack.push(dialogId, component, data);
  }, [dialogStack, dialogId]);

  const close = useCallback(() => {
    if (dialogStack.canClose(dialogId)) {
      dialogStack.pop();
    } else {
      dialogStack.remove(dialogId);
    }
  }, [dialogStack, dialogId]);

  const isOpen = useMemo(() => {
    return dialogStack.isOpen(dialogId);
  }, [dialogStack, dialogId]);

  const canClose = useMemo(() => {
    return dialogStack.canClose(dialogId);
  }, [dialogStack, dialogId]);

  const data = useMemo(() => {
    return dialogStack.getDialogData(dialogId);
  }, [dialogStack, dialogId]);

  const isActive = useMemo(() => {
    return dialogStack.currentDialog?.id === dialogId;
  }, [dialogStack.currentDialog, dialogId]);

  return {
    open,
    close,
    isOpen,
    canClose,
    isActive,
    data,
  };
}

// 複数のダイアログを管理するためのContext Provider用フック
export function useDialogManager() {
  const dialogStack = useDialogStack();

  // よく使用されるダイアログのヘルパー
  const editPersonDialog = useSpecificDialog('editPerson');
  const deleteConfirmDialog = useSpecificDialog('deleteConfirm');
  const connectionDialog = useSpecificDialog('connection');
  const mergeDialog = useSpecificDialog('merge');

  const openEditPerson = useCallback((personData: any) => {
    editPersonDialog.open('EditPersonDialog', personData);
  }, [editPersonDialog]);

  const openDeleteConfirm = useCallback((deleteData: any) => {
    deleteConfirmDialog.open('DeleteConfirmDialog', deleteData);
  }, [deleteConfirmDialog]);

  const openConnection = useCallback((connectionData: any) => {
    connectionDialog.open('ConnectionDialog', connectionData);
  }, [connectionDialog]);

  const openMerge = useCallback((mergeData: any) => {
    mergeDialog.open('MergeDialog', mergeData);
  }, [mergeDialog]);

  return {
    // 基本的なスタック操作
    ...dialogStack,
    
    // 特定のダイアログ
    editPersonDialog,
    deleteConfirmDialog,
    connectionDialog,
    mergeDialog,
    
    // 便利なヘルパー関数
    openEditPerson,
    openDeleteConfirm,
    openConnection,
    openMerge,
  };
}