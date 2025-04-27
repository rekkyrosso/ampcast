import React from 'react';
import MediaType from 'types/MediaType';
import PlaylistItem from 'types/PlaylistItem';
import Visualizer from 'types/Visualizer';
import MediaInfo from './MediaInfo';
import VisualizerInfo from './VisualizerInfo';

export interface CurrentlyPlayingProps {
    item: PlaylistItem | null;
    visualizer: Visualizer | null;
}

export default function CurrentlyPlaying({item, visualizer}: CurrentlyPlayingProps) {
    return (
        <div className="currently-playing">
            {item ? <MediaInfo item={item} /> : <p>No media loaded.</p>}
            {item && item.mediaType !== MediaType.Video ? (
                <VisualizerInfo visualizer={visualizer} />
            ) : null}
        </div>
    );
}
