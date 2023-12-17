import React from 'react';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import PlaybackState from './PlaybackState';
import useInterstitialState from './useInterstitialState';
import './Interstitial.scss';

export default function Interstitial() {
    const item = useCurrentlyPlaying();
    const state = useInterstitialState();

    return (
        <div className={`interstitial ${state}`}>
            <div className="currently-playing">
                {item ? (
                    <>
                        <h2>{item.title}</h2>
                        {item.artists?.length ? (
                            <>
                                <span className="by">by</span>
                                <h3>{item.artists.join(', ')}</h3>
                            </>
                        ) : null}
                    </>
                ) : (
                    <p>The playlist is empty.</p>
                )}
            </div>
            <PlaybackState />
        </div>
    );
}
