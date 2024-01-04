let dragData: any = null;
let dragEffect: DataTransfer['effectAllowed'] = 'none';

const internalType = 'text/ampcast-items';

function getData<T>(event: React.DragEvent): T | null {
    return event.dataTransfer.getData(internalType) === '#globalDrag' ? dragData : null;
}

function getEffect(event: React.DragEvent): DataTransfer['effectAllowed'] {
    return event.dataTransfer.getData(internalType) === '#globalDrag' ? dragEffect : 'none';
}

function set<T>(event: React.DragEvent, data: T, effect: DataTransfer['effectAllowed']): void {
    event.dataTransfer.setData(internalType, '#globalDrag');
    event.dataTransfer.effectAllowed = effect;
    dragData = data;
    // This is needed for Safari which doesn't seem to allow changing `effectAllowed`.
    dragEffect = effect;
}

function unset(): void {
    dragData = null;
    dragEffect = 'none';
}

export default {
    get type(): string {
        return internalType
    },
    set,
    unset,
    getData,
    getEffect,
};
