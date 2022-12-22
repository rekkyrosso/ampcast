import {useEffect} from 'react';
import mediaPlayback from 'services/mediaPlayback';
import {stopPropagation} from 'utils';

export default function useGlobalActions() {
    useEffect(() => {
        document.getElementById('system')!.addEventListener('keydown', stopPropagation);
        document.getElementById('popup')!.addEventListener('keydown', stopPropagation);

        document.body.addEventListener('keydown', handleKeyDown);
    }, []);
}

function handleKeyDown(event: KeyboardEvent) {
    switch (event.key) {
        case ' ':
            if (event.target && !('form' in event.target)) {
                event.preventDefault();
                togglePlayPause();
            }
            break;

        case 'MediaPlayPause':
            event.preventDefault();
            togglePlayPause();
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
    }
}

function togglePlayPause(): void {
    if (mediaPlayback.paused) {
        mediaPlayback.play();
    } else {
        mediaPlayback.pause();
    }
}
