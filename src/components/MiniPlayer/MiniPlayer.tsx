import React from 'react';
import {browser} from 'utils';
import AppDragRegion from 'components/App/AppDragRegion';
import AppTitle from 'components/App/AppTitle';
import {CloseButton} from 'components/Button';
import Media from 'components/Media';
import './MiniPlayer.scss';

export default function MiniPlayer() {
    return (
        <div className="mini-player">
            <header>
                <AppTitle />
                <AppDragRegion />
                {browser.isElectron ? <CloseButton onClick={close} /> : null}
            </header>
            <Media />
        </div>
    );
}
