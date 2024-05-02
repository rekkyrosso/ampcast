import {useCallback} from 'react';
import MediaObject from 'types/MediaObject';

export default function useOnDragStart<T extends MediaObject>(selectedItems: readonly T[]) {
    return useCallback(
        (event: React.DragEvent) => {
            const spotifyTracks = selectedItems.filter((item) => item.src.startsWith('spotify:track:'));
            if (spotifyTracks.length > 0) {
                // Allow dragging of Spotify tracks to external Spotify apps.
                const trackUris = spotifyTracks.map((item) => item.src);
                event.dataTransfer.setData('text/x-spotify-tracks', trackUris.join('\n'));
                event.dataTransfer.effectAllowed = 'copyMove';
            }
        },
        [selectedItems]
    );
}
