import React, {memo, useEffect, useState} from 'react';
import MediaItem from 'types/MediaItem';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import usePaused from 'hooks/usePaused';
import useInterstitialState, {InterstitialState} from './useInterstitialState';
import './Interstitial.scss';

function Interstitial() {
    const item = useCurrentlyPlaying();
    const state = useInterstitialState();
    const [isRecent, setIsRecent] = useState(false);
    const playlistItemId = item?.id;

    useEffect(() => {
        setIsRecent(true);
        const timerId = setTimeout(() => setIsRecent(false), 5000);
        return () => clearTimeout(timerId);
    }, [playlistItemId]);

    return (
        <div className={`interstitial ${state} ${isRecent ? 'is-recent' : ''}`}>
            {item ? <CurrentlyPlaying item={item} state={state} /> : <EmptyPlaylist />}
        </div>
    );
}

export default memo(Interstitial);

interface CurrentlyPlayingProps {
    item: MediaItem;
    state: InterstitialState;
}

function CurrentlyPlaying({item, state}: CurrentlyPlayingProps) {
    const paused = usePaused();

    return (
        <>
            <h3>{item.title}</h3>
            {item.artists ? (
                <>
                    <span className="by">by</span>
                    <h4>{item.artists.join(', ')}</h4>
                </>
            ) : null}
            <span className="interstitial-state">
                {paused ? '' : `${state === 'ready' ? 'playing' : state}...`}
            </span>
        </>
    );
}

function EmptyPlaylist() {
    return <p>The playlist is empty.</p>;
}
