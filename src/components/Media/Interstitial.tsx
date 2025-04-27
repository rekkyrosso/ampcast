import React from 'react';
import {isMiniPlayer} from 'utils';
import MediaSourceLabel from 'components/MediaSources/MediaSourceLabel';
import ProvidedBy from 'components/MediaSources/ProvidedBy';
import useCurrentTrack from 'hooks/useCurrentTrack';
import PlaybackState from './PlaybackState';
import useInterstitialState from './useInterstitialState';
import './Interstitial.scss';

export default function Interstitial() {
    const item = useCurrentTrack();
    const state = useInterstitialState();
    const isRadioStation = item?.src.startsWith('internet-radio:station:');

    return (
        <div className={`interstitial ${state}`}>
            <div className="currently-playing">
                {item ? (
                    isRadioStation ? (
                        <h2>
                            <MediaSourceLabel icon="internet-radio" text={item.title} />
                        </h2>
                    ) : (
                        <>
                            <h2>{item.title}</h2>
                            {item.artists?.length ? (
                                <>
                                    <span className="by">by</span>
                                    <h3>{item.artists.join(', ')}</h3>
                                </>
                            ) : null}
                            <p>
                                <ProvidedBy item={item} />
                            </p>
                        </>
                    )
                ) : (
                    <p>{isMiniPlayer ? 'No media loaded.' : 'The playlist is empty.'}</p>
                )}
            </div>
            <PlaybackState />
        </div>
    );
}
