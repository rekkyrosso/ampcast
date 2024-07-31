import React from 'react';
import AppDragRegion from 'components/App/AppDragRegion';
import AppTitle from 'components/App/AppTitle';
import Media from 'components/Media';
import './MiniPlayer.scss';

export default function MiniPlayer() {
    return (
        <div className="mini-player">
            <AppTitle />
            <AppDragRegion />
            <Media />
        </div>
    );
}
