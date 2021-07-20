import React, {useEffect, useState} from 'react';
import MediaItem from 'types/MediaItem';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import './Interstitial.scss';

export default function Interstitial() {
    const item = useCurrentlyPlaying();
    const [isRecent, setIsRecent] = useState(false);

    useEffect(() => {
        const timerId = setTimeout(() => setIsRecent(false), 5000);
        setIsRecent(true);
        return () => clearTimeout(timerId);
    }, [item]);

    return (
        <div className={`interstitial ${isRecent ? 'is-recent' : ''}`}>
            {item ? <CurrentlyPlaying item={item} /> : <p>The playlist is empty.</p>}
        </div>
    );
}

interface CurrentlyPlayingProps {
    item: MediaItem;
}

function CurrentlyPlaying({item}: CurrentlyPlayingProps) {
    return (
        <div className="currently-playing">
            <h3>{item.title}</h3>
            {item.artist ? (
                <>
                    <span className="by">by</span>
                    <h4>{item.artist}</h4>
                </>
            ) : null}
        </div>
    );
}
