import {useMemo} from 'react';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaSource from 'types/MediaSource';

export default function usePinnedSource(
    source: MediaSource<MediaPlaylist>
): MediaSource<MediaPlaylist> {
    // We can probably get rid of this but it means fixing the layouts of pinned playlists elsewhere.
    return useMemo(() => {
        const primaryItems = source.primaryItems;
        if (primaryItems) {
            let layout = primaryItems.layout;
            if (layout?.card && layout.card.h1 !== 'IconTitle') {
                // Make sure to show branding.
                layout = structuredClone(layout);
                (layout.card as any).h1 = 'IconTitle';
                return {...source, primaryItems: {...primaryItems, layout}};
            }
        }
        return source;
    }, [source]);
}
