import React from 'react';
import {ListViewHandle} from 'components/ListView';
import IconButtons from 'components/Button/IconButtons';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import usePlaybackState from 'hooks/usePlaybackState';
import MediaButtons from './MediaButtons';
import PlaylistMenuButton from './PlaylistMenuButton';
import RadioButtons from './RadioButtons';
import TimeControl from './TimeControl';
import VolumeControl from './VolumeControl';
import './MediaControls.scss';
import './MediaControls-overlay.scss';

export interface MediaControlsProps {
    overlay?: boolean;
    playlistRef?: React.RefObject<ListViewHandle | null>;
}

export default function MediaControls({overlay, playlistRef}: MediaControlsProps) {
    const currentlyPlaying = useCurrentlyPlaying();
    const {paused} = usePlaybackState();

    return (
        <div className={`media-controls${overlay ? '-overlay' : ''}`}>
            <TimeControl overlay={overlay} />
            <div className="playback-control">
                <VolumeControl overlay={overlay} />
                {overlay ? (
                    <>
                        <IconButtons className="media-buttons">
                            <MediaButtons overlay={overlay} />
                        </IconButtons>
                        {currentlyPlaying?.skippable && !paused ? (
                            <IconButtons className="radio-buttons">
                                <RadioButtons overlay />
                            </IconButtons>
                        ) : null}
                    </>
                ) : (
                    <div className="media-buttons">
                        <MediaButtons overlay={overlay} playlistRef={playlistRef} />
                    </div>
                )}
                {!overlay && playlistRef ? <PlaylistMenuButton playlistRef={playlistRef} /> : null}
            </div>
        </div>
    );
}
