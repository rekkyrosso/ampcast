import React from 'react';
import MediaItem from 'types/MediaItem';
import MediaSource from 'types/MediaSource';
import EmptyScreen from 'components/EmptyScreen';
import {DefaultBrowser} from 'components/MediaBrowser';
import apple from '../apple';

export interface AppleMusicVideoProps {
    sources: readonly MediaSource<MediaItem>[];
}

export default function AppleMusicVideo({sources}: AppleMusicVideoProps) {
    const isBeta = window.MusicKit?.version.startsWith('3');
    return isBeta ? <DefaultBrowser service={apple} sources={sources} /> : <BetaWarning />;
}

function BetaWarning() {
    return (
        <EmptyScreen>
            <div className="note">
                <p>
                    <strong>Apple MusicKit beta required.</strong>
                </p>
                <p>
                    You need to enable <strong>MusicKit beta</strong> from the settings to watch
                    videos from Apple Music.
                </p>
            </div>
        </EmptyScreen>
    );
}
