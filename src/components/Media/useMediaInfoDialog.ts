import {RefObject, useState, useEffect} from 'react';
import {fromEvent} from 'rxjs';
import {browser} from 'utils';

export default function useMediaInfoDialog(dialogRef: RefObject<HTMLDialogElement>) {
    const [debug, setDebug] = useState(false);

    useEffect(() => {
        // TODO: Why is this here?
        if (dialogRef.current) {
            const activeElements = document.querySelectorAll('.focus');
            for (const activeElement of activeElements) {
                activeElement.classList.toggle('focus', false);
            }
        }
        const subscription = fromEvent<KeyboardEvent>(document, 'keydown', {
            capture: true,
        }).subscribe((event) => {
            if (!event.repeat) {
                if (event.ctrlKey && event.shiftKey && event.code === 'Digit8') {
                    setDebug((debug) => !debug);
                } else if (event[browser.ctrlKey] && !event.shiftKey && event.code === 'KeyI') {
                    dialogRef.current?.close();
                }
            }
        });
        return () => subscription.unsubscribe();
    }, [dialogRef]);

    return {debug};
}
