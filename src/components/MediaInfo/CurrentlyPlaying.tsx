import React from 'react';
import MediaType from 'types/MediaType';
import PlaylistItem from 'types/PlaylistItem';
import Visualizer from 'types/Visualizer';
import MediaInfo from './MediaInfo';
import VisualizerInfo from './VisualizerInfo';

export interface CurrentlyPlayingProps {
    item: PlaylistItem;
    visualizer: Visualizer | null;
}

export default function CurrentlyPlaying({item, visualizer}: CurrentlyPlayingProps) {
    return (
        <div className="currently-playing">
            <MediaInfo item={item} />
            {item.mediaType !== MediaType.Video ? (
                <VisualizerInfo visualizer={visualizer} />
            ) : null}
        </div>
    );
}
