import {useCallback} from 'react';
import {BehaviorSubject} from 'rxjs';
import MediaAlbum from 'types/MediaAlbum';
import MediaSource from 'types/MediaSource';
import {otherTracksLayout, radiosLayoutSmall, videosLayout} from 'components/MediaList/layouts';
import useObservable from 'hooks/useObservable';

// THis provides a way to hijack the view menus so that we can 
// provide tailored views for each type of synthetic album.
// Synthetic albums are created by ampcast to group specific artist 
// tracks together.
// e.g. "All Tracks", "Videos", "Radios".

const syntheticSource$ = new BehaviorSubject<MediaSource | null>(null);
const observeSyntheticSource = () => syntheticSource$;

export default function useSyntheticAlbumSource() {
    const source = useObservable(observeSyntheticSource, syntheticSource$.value);

    const update = useCallback((source: MediaSource, album: MediaAlbum | null) => {
        if (album?.synthetic) {
            let label: string | undefined;
            let layout = otherTracksLayout;
            const [, type] = album.src.split(':');
            if (type === 'radios') {
                layout = radiosLayoutSmall;
                label = 'Radios';
            } else if (type === 'videos') {
                layout = videosLayout;
                label = 'Videos';
            }
            syntheticSource$.next({
                ...source,
                sourceId: `${source.sourceId || source.id}/${type}`,
                tertiaryItems: {
                    ...source.tertiaryItems,
                    label,
                    layout,
                },
            });
        } else {
            syntheticSource$.next(null);
        }
    }, []);

    const reset = useCallback(() => {
        syntheticSource$.next(null);
    }, []);

    return [source, update, reset] as const;
}
