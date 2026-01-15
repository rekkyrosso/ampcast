let dragData: readonly any[] | null = null;
let dropEffect: DataTransfer['dropEffect'] = 'none'; // Fixes some browser bugs.

const internalType = 'text/ampcast-items';

function getData<T>(): readonly T[] | null {
    return dragData;
}

function setData<T>(event: React.DragEvent, data: readonly T[] | null): void {
    event.dataTransfer.setData(internalType, '#globalDrag');
    dragData = data;
}

function clear(): void {
    dragData = null;
    dropEffect = 'none';
}

export default {
    get dropEffect(): DataTransfer['dropEffect'] {
        return dropEffect;
    },
    set dropEffect(effect: DataTransfer['dropEffect']) {
        dropEffect = effect;
    },
    get type(): string {
        return internalType;
    },
    getData,
    setData,
    clear,
};
