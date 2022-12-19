import React, {memo, useCallback} from 'react';
import {observeLocked, lock, unlock, nextVisualizer} from 'services/visualizer';
import Icon from 'components/Icon';
import IconButton from 'components/Button/IconButton';
import IconButtons from 'components/Button/IconButtons';
import useObservable from 'hooks/useObservable';
import {showDialog} from 'components/Dialog';
import {VisualizerSettingsDialog} from 'components/Settings';
import CurrentlyPlayingDialog from './CurrentlyPlayingDialog';
import useVideoSourceIcon from './useVideoSourceIcon';
import './Visualizer.scss';

function VisualizerControls() {
    const locked = useObservable(observeLocked, false);
    const videoIcon = useVideoSourceIcon();

    const openInfoDialog = useCallback(() => {
        showDialog(CurrentlyPlayingDialog);
    }, []);

    const openSettingsDialog = useCallback(() => {
        showDialog(VisualizerSettingsDialog, true);
    }, []);

    return (
        <div className="visualizer-controls">
            <IconButtons className="visualizer-controls-settings">
                <IconButton
                    className="with-overlay"
                    icon="info"
                    title="Info"
                    tabIndex={-1}
                    onClick={openInfoDialog}
                />
                <IconButton
                    className="with-overlay"
                    icon="settings"
                    title="Settings"
                    tabIndex={-1}
                    onClick={openSettingsDialog}
                />
            </IconButtons>
            <IconButtons className="visualizer-controls-selector">
                <IconButton
                    className="with-overlay"
                    icon={locked ? 'locked' : 'unlocked'}
                    title={`${locked ? 'Unlock' : 'Lock the current visualizer'}`}
                    tabIndex={-1}
                    onClick={locked ? unlock : lock}
                />
                {locked ? null : (
                    <IconButton
                        className="with-overlay"
                        icon="right"
                        title="Next visualizer"
                        tabIndex={-1}
                        onClick={nextVisualizer}
                    />
                )}
            </IconButtons>
            {videoIcon ? <Icon className="source-icon" name={videoIcon} /> : null}
        </div>
    );
}

export default memo(VisualizerControls);
