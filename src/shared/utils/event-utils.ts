/**
 * イベントが特定の要素から発生したかチェック
 */
export function isEventFromInteractiveElement(event: React.MouseEvent | React.KeyboardEvent): boolean {
    const target = event.target as HTMLElement;
    const interactiveSelectors = [
        'button',
        '[role="button"]',
        '[role="checkbox"]',
        'input',
        'select',
        'textarea',
        'a[href]',
        '[tabindex]:not([tabindex="-1"])',
    ];

    return interactiveSelectors.some(selector =>
        target.matches(selector) || target.closest(selector)
    );
}

/**
 * ドラッグ中かどうかを判定するためのグローバル状態
 */
let isDragging = false;

export function setDraggingState(dragging: boolean): void {
    isDragging = dragging;
    if (dragging) {
        document.body.classList.add('is-dragging');
    } else {
        document.body.classList.remove('is-dragging');
    }
}

export function getIsDragging(): boolean {
    return isDragging;
}

/**
 * クリックイベントをハンドリングする際の共通パターン
 */
export function handleCardClick(
    event: React.MouseEvent,
    callbacks: {
        onInteractiveClick?: () => void;
        onCardClick?: () => void;
    }
): void {
    // ドラッグ中はクリックを無視
    if (getIsDragging()) {
        event.preventDefault();
        event.stopPropagation();
        return;
    }

    // インタラクティブ要素のクリックは処理しない
    if (isEventFromInteractiveElement(event)) {
        callbacks.onInteractiveClick?.();
        return;
    }

    // カード自体のクリック
    callbacks.onCardClick?.();
}

/**
 * ダイアログ内のイベント伝播を制御
 */
export function preventDialogClose(event: React.MouseEvent): void {
    // ダイアログの背景クリックによる閉じる動作を防ぐ
    const target = event.target as HTMLElement;
    if (target.getAttribute('data-radix-dismissable') === '') {
        event.preventDefault();
        event.stopPropagation();
    }
} 