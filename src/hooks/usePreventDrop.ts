import {useEffect} from 'react';
import {fromEvent, merge} from 'rxjs';
import {tap} from 'rxjs/operators';
import {preventDefault} from 'utils';

export default function usePreventDrop(): void {
    useEffect(() => {
        const dragEnter$ = fromEvent<DragEvent>(document, 'dragenter');
        const dragOver$ = fromEvent<DragEvent>(document, 'dragover');
        const drop$ = fromEvent<DragEvent>(document, 'drop');
        const cancelDrag$ = merge(dragEnter$, dragOver$).pipe(tap(preventDragOver));
        const cancelDrop$ = drop$.pipe(tap(preventDefault));
        const subscription = merge(cancelDrag$, cancelDrop$).subscribe();
        return () => subscription.unsubscribe();
    }, []);
}

function preventDragOver(event: DragEvent): void {
    const dataTransfer = event.dataTransfer;
    if (dataTransfer) {
        event.preventDefault();
        dataTransfer.effectAllowed = 'none';
        dataTransfer.dropEffect = 'none';
    }
}
