import React from 'react';
import {Except} from 'type-fest';
import MediaItem from 'types/MediaItem';
import EmptyScreen from 'components/EmptyScreen';
import {PagedItemsProps} from 'components/MediaBrowser/PagedItems';
import MediaItems from 'components/MediaBrowser/MediaItems';
import apple from '../apple';

export default function AppleMusicVideos(props: Except<PagedItemsProps<MediaItem>, 'service'>) {
    const isBeta = window.MusicKit?.version.startsWith('3');
    return isBeta ? <MediaItems {...props} service={apple} /> : <AppleBetaWarning />;
}

function AppleBetaWarning() {
    return (
        <EmptyScreen>
            <div className="note">
                <p>
                    <strong>Apple MusicKit beta required.</strong>
                </p>
                <p>
                    You need to enable <strong>MusicKit beta</strong> from the Settings screen to
                    watch videos from {apple.name}.
                </p>
            </div>
        </EmptyScreen>
    );
}
