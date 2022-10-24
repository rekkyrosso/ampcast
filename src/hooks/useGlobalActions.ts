import {useEffect} from 'react';
import mediaPlayback from 'services/mediaPlayback';
import {stopPropagation} from 'utils';
import usePaused from './usePaused';

export default function useGlobalActions() {
    const paused = usePaused();

    // TODO: This doesn't belong here.
    useEffect(() => {
        document.getElementById('system')!.addEventListener('keydown', stopPropagation);
        document.getElementById('popup')!.addEventListener('keydown', stopPropagation);
    }, []);

    useEffect(() => {
        document.body.addEventListener('keydown', (event) => handleKeyDown(event, paused));
    }, [paused]);
}

function handleKeyDown(event: KeyboardEvent, paused: boolean) {
    switch (event.key) {
        case ' ':
        case 'MediaPlayPause':
            event.preventDefault();
            if (paused) {
                mediaPlayback.play();
            } else {
                mediaPlayback.pause();
            }
            break;

        case 'MediaStop':
            event.preventDefault();
            mediaPlayback.stop();
            break;

        case 'MediaTrackPrevious':
            event.preventDefault();
            mediaPlayback.prev();
            break;

        case 'MediaTrackNext':
            event.preventDefault();
            mediaPlayback.next();
            break;

        case 'AudioVolumeMute':
            event.preventDefault();
            mediaPlayback.muted = true;
            break;
    }
}
