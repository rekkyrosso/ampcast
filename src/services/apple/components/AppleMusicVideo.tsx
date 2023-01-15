import React from 'react';
import EmptyScreen from 'components/EmptyScreen';
import {DefaultBrowser} from 'components/MediaBrowser';
import apple, {appleMusicVideos} from '../apple';

const sources = [appleMusicVideos];

export default function AppleMusicVideo() {
    const isBeta = window.MusicKit?.version.startsWith('3');
    return isBeta ? <DefaultBrowser service={apple} sources={sources} /> : <BetaWarning />;
}

function BetaWarning() {
    return (
        <EmptyScreen>
            <p>
                <strong>Apple MusicKit beta required.</strong>
            </p>
            <p>
                You need to enable <strong>MusicKit beta</strong> from the settings to watch videos
                from Apple Music.
            </p>
        </EmptyScreen>
    );
}
