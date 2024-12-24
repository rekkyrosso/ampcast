import {RefObject, useEffect} from 'react';
import {fromEvent} from 'rxjs';
import {browser} from 'utils';

export default function useMediaInfoDialog(dialogRef: RefObject<HTMLDialogElement | null>) {
    useEffect(() => {
        const subscription = fromEvent<KeyboardEvent>(document, 'keydown', {
            capture: true,
        }).subscribe((event) => {
            if (
                event[browser.ctrlKey] &&
                !event.shiftKey &&
                event.code === 'KeyI' &&
                !event.repeat
            ) {
                event.preventDefault();
                dialogRef.current?.close();
            }
        });
        return () => subscription.unsubscribe();
    }, [dialogRef]);
}
