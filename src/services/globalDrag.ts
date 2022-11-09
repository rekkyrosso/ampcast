let dragData: any = null;

function get<T>(event: React.DragEvent): T | null {
    return event.dataTransfer.getData('text') === '#globalDrag' ? dragData : null;
}

function set<T>(event: React.DragEvent, data: T): void {
    event.dataTransfer.setData('text', '#globalDrag');
    dragData = data;
}

function unset(): void {
    dragData = null;
}

export default {get, set, unset};
