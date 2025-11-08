let dragData: any = null;

const internalType = 'text/ampcast-items';

function getData<T>(event: React.DragEvent): T | null {
    return event.dataTransfer.getData(internalType) === '#globalDrag' ? dragData : null;
}

function setData<T>(event: React.DragEvent, data: T): void {
    event.dataTransfer.setData(internalType, '#globalDrag');
    dragData = data;
}

function clearData(): void {
    dragData = null;
}

export default {
    get type(): string {
        return internalType
    },
    getData,
    setData,
    clearData,
};
