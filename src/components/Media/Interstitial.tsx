import React, {memo, useEffect, useState} from 'react';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import usePaused from 'hooks/usePaused';
import useInterstitialState from './useInterstitialState';
import './Interstitial.scss';

export default memo(function Interstitial() {
    const item = useCurrentlyPlaying();
    const paused = usePaused();
    const state = useInterstitialState();
    const [ready, setReady] = useState(false);
    const [isRecent, setIsRecent] = useState(false);
    const playlistItemId = item?.id;

    useEffect(() => {
        setIsRecent(true);
        const timerId = setTimeout(() => setIsRecent(false), 5000);
        return () => clearTimeout(timerId);
    }, [playlistItemId]);

    useEffect(() => {
        if (state === 'error') {
            setReady(true);
            setIsRecent(false);
        } else {
            setReady(false);
            if (state === 'playing') {
                const timerId = setTimeout(() => setReady(true), 4500);
                return () => clearTimeout(timerId);
            }
        }
    }, [state]);

    return (
        <div
            className={`interstitial ${state} ${ready ? 'ready' : ''} ${
                isRecent ? 'is-recent' : ''
            }`}
        >
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
            <p className="interstitial-state">
                {paused ? '' : state === 'error' ? state : `${state}...`}
            </p>
        </div>
    );
});
