import React from 'react';
import {isMiniPlayer} from 'utils';
import miniPlayer from 'services/mediaPlayback/miniPlayer';
import IconButtons from 'components/Button/IconButtons';
import IconButton from 'components/Button';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import useMiniPlayerActive from 'hooks/useMiniPlayerActive';
import PlaybackState from './PlaybackState';
import useInterstitialState from './useInterstitialState';
import './Interstitial.scss';

export default function Interstitial() {
    const item = useCurrentlyPlaying();
    const state = useInterstitialState();
    const miniPlayerActive = useMiniPlayerActive();

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
                    <p>{isMiniPlayer ? 'No media loaded.' : 'The playlist is empty.'}</p>
                )}
            </div>

            {miniPlayerActive ? (
                <IconButtons className="interstitial-buttons">
                    <IconButton
                        icon="link"
                        title="Playback window"
                        tabIndex={-1}
                        onClick={miniPlayer.open}
                    />
                </IconButtons>
            ) : null}
            <PlaybackState />
        </div>
    );
}
