import React from 'react';
import {isMiniPlayer} from 'utils';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import useCurrentTrack from 'hooks/useCurrentTrack';
import usePaused from 'hooks/usePaused';
import PlaybackState from './PlaybackState';
import ProvidedBy from './ProvidedBy';
import useInterstitialState from './useInterstitialState';
import './Interstitial.scss';

export default function Interstitial() {
    const currentTrack = useCurrentTrack();
    const currentlyPlaying = useCurrentlyPlaying();
    const paused = usePaused();
    const item = paused ? currentlyPlaying : currentTrack;
    const state = useInterstitialState();

    return (
        <div className={`interstitial ${state}`}>
            <div className="currently-playing">
                {item ? (
                    <>
                        <h2 className="title">{item.title}</h2>
                        {item.artists?.length ? (
                            <>
                                <span className="by">by</span>
                                <h3 className="sub-title">{item.artists.join(', ')}</h3>
                            </>
                        ) : null}
                        <p className="provider">
                            <ProvidedBy item={item} />
                        </p>
                    </>
                ) : (
                    <p>{isMiniPlayer ? 'No media loaded.' : 'The playlist is empty.'}</p>
                )}
            </div>
            <PlaybackState />
        </div>
    );
}
