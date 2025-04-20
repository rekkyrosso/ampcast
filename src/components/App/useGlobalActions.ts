import {useEffect} from 'react';
import {browser, stopPropagation} from 'utils';
import mediaPlayback from 'services/mediaPlayback';
import playback from 'services/mediaPlayback/playback';
import preferences from 'services/preferences';

export default function useGlobalActions() {
    useEffect(() => {
        document.getElementById('system')!.addEventListener('keydown', stopPropagation);
        document.getElementById('popup')!.addEventListener('keydown', stopPropagation);
        document.body.addEventListener('keydown', handleKeyDown);
    }, []);
}

function handleKeyDown(event: KeyboardEvent) {
    const isFormControl = event.target && 'form' in event.target;

    switch (event.code) {
        case 'Space':
            if (!isFormControl && preferences.spacebarTogglePlay) {
                event.preventDefault();
                togglePlayPause();
            }
            break;

        case 'KeyA':
            if (!isFormControl && event[browser.cmdKey] && !event.shiftKey) {
                event.preventDefault();
            }
            break;

        default:
            switch (event.key) {
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
}

function togglePlayPause(): void {
    if (playback.paused) {
        mediaPlayback.play();
    } else {
        mediaPlayback.pause();
    }
}
