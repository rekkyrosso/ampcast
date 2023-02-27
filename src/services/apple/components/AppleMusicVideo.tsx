import React from 'react';
import MediaItem from 'types/MediaItem';
import EmptyScreen from 'components/EmptyScreen';
import {PagedBrowserProps} from 'components/MediaBrowser';
import MediaItemBrowser from 'components/MediaBrowser/MediaItemBrowser';

export default function AppleMusicVideo(props: PagedBrowserProps<MediaItem>) {
    const isBeta = window.MusicKit?.version.startsWith('3');
    return isBeta ? <MediaItemBrowser {...props} /> : <BetaWarning />;
}

function BetaWarning() {
    return (
        <EmptyScreen>
            <div className="note">
                <p>
                    <strong>Apple MusicKit beta required.</strong>
                </p>
                <p>
                    You need to enable <strong>MusicKit beta</strong> from the Settings screen to
                    watch videos from Apple Music.
                </p>
            </div>
        </EmptyScreen>
    );
}
