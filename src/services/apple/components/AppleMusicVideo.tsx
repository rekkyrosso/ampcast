import React from 'react';
import MediaItemBrowser from 'components/MediaBrowser/MediaItemBrowser';
import EmptyScreen from 'components/EmptyScreen';
import {appleMusicVideos} from '../apple';

export default function AppleMusicVideo() {
    const isBeta = window.MusicKit?.version.startsWith('3');
    return isBeta ? <MediaItemBrowser source={appleMusicVideos} /> : <BetaWarning />;
}

function BetaWarning() {
    return (
        <EmptyScreen>
            <div className="note">
                <p>
                    You need to enable MusicKit beta from the settings to watch videos from Apple
                    Music.
                </p>
            </div>
        </EmptyScreen>
    );
}
