import {useEffect, useState} from 'react';
import {fromEvent, map} from 'rxjs';

export default function useIsFullscreen(): boolean {
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const subscription = fromEvent(document, 'fullscreenchange')
            .pipe(map(() => !!document.fullscreenElement))
            .subscribe(setIsFullscreen);
        return () => subscription.unsubscribe();
    }, []);

    return isFullscreen;
}
