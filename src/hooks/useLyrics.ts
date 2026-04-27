import {useEffect, useState} from 'react';
import {defer, from} from 'rxjs';
import Lyrics from 'types/Lyrics';
import MediaItem from 'types/MediaItem';
import {getLyrics} from 'services/lyrics';

export interface LyricsResponse {
    readonly lyrics?: Lyrics | null;
    readonly error?: unknown;
    readonly loaded: boolean;
}

const notLoaded: LyricsResponse = {
    loaded: false,
};

export default function useLyrics(item: MediaItem): LyricsResponse {
    const [currentItem, setCurrentItem] = useState<MediaItem | null>(null);
    const [response, setResponse] = useState<LyricsResponse>(notLoaded);

    useEffect(() => {
        setCurrentItem((currentItem) => (item.src === currentItem?.src ? currentItem : item));
    }, [item]);

    useEffect(() => {
        setResponse(notLoaded);
        if (currentItem) {
            const subscription = defer(() => from(getLyrics(currentItem))).subscribe({
                next: (lyrics) => setResponse({lyrics, loaded: true}),
                error: (error) => setResponse({error, loaded: true}),
            });
            return () => subscription.unsubscribe();
        }
    }, [currentItem]);

    return response;
}
