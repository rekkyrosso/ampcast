import React, {memo, useCallback, useEffect, useState} from 'react';
import {timer} from 'rxjs';
import {
    observeLocked,
    lock,
    unlock,
    nextVisualizer,
    observeProviderId,
    observeCurrentVisualizers,
} from 'services/visualizer';
import Icon from 'components/Icon';
import IconButton from 'components/Button/IconButton';
import IconButtons from 'components/Button/IconButtons';
import useObservable from 'hooks/useObservable';
import {showDialog} from 'components/Dialog';
import {VisualizerSettingsDialog} from 'components/Settings';
import CurrentlyPlayingDialog from 'components/MediaInfo/CurrentlyPlayingDialog';
import Static from './Static';
import useVideoSourceIcon from './useVideoSourceIcon';
import './Visualizer.scss';

export default memo(function VisualizerControls() {
    const currentVisualizers = useObservable(observeCurrentVisualizers, []);
    const locked = useObservable(observeLocked, false);
    const providerId = useObservable(observeProviderId, undefined);
    const hasVisualizers = providerId !== 'none';
    const isRandom = !providerId;
    const hasNext = !locked && (isRandom || currentVisualizers.length > 1);
    const videoIcon = useVideoSourceIcon();
    const [nextClicked, setNextClicked] = useState(0);

    const openInfoDialog = useCallback(() => {
        showDialog(CurrentlyPlayingDialog);
    }, []);

    const openSettingsDialog = useCallback(() => {
        showDialog(VisualizerSettingsDialog, true);
    }, []);

    const handleNextClick = useCallback(() => {
        setNextClicked(nextClicked + 1);
        if (nextClicked === 0) {
            setTimeout(() => nextVisualizer('click'));
        }
    }, [nextClicked]);

    useEffect(() => {
        if (nextClicked) {
            const subscription = timer(500).subscribe(() => setNextClicked(0));
            return () => subscription.unsubscribe();
        }
    }, [nextClicked]);

    return (
        <div className="visualizer-controls">
            {hasVisualizers && nextClicked ? <Static /> : null}
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
            {hasVisualizers ? (
                <IconButtons className="visualizer-controls-selector">
                    <IconButton
                        className="with-overlay"
                        icon={locked ? 'locked' : 'unlocked'}
                        title={`${locked ? 'Unlock' : 'Lock the current visualizer'}`}
                        tabIndex={-1}
                        onClick={locked ? unlock : lock}
                    />
                    {hasNext ? (
                        <IconButton
                            className="with-overlay"
                            icon="right"
                            title="Next visualizer"
                            tabIndex={-1}
                            onClick={handleNextClick}
                        />
                    ) : null}
                </IconButtons>
            ) : null}
            {videoIcon ? <Icon className="source-icon" name={videoIcon} /> : null}
        </div>
    );
});
