let dragData: any = null;

function get<T>(event: React.DragEvent): T | null {
    const dataTransfer = event.dataTransfer;
    if (dataTransfer.getData('text') === '#globalDrag') {
        return dragData;
    }
    return null;
}

function set<T>(event: React.DragEvent, data: T): void {
    const dataTransfer = event.dataTransfer;
    dataTransfer.setData('text', '#globalDrag');
    dragData = data;
}

function unset(): void {
    dragData = null;
}

export default {get, set, unset};
