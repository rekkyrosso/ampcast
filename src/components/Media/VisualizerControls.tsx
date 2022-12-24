import React, {memo, useCallback, useEffect, useState} from 'react';
import {timer} from 'rxjs';
import {
    observeLocked,
    lock,
    unlock,
    nextVisualizer,
    observeProviderId,
    observeNextVisualizerReason,
    observeCurrentVisualizers,
} from 'services/visualizer';
import Icon from 'components/Icon';
import IconButton from 'components/Button/IconButton';
import IconButtons from 'components/Button/IconButtons';
import useCurrentVisualizer from 'hooks/useCurrentVisualizer';
import useObservable from 'hooks/useObservable';
import {showDialog} from 'components/Dialog';
import {VisualizerSettingsDialog} from 'components/Settings';
import CurrentlyPlayingDialog from './CurrentlyPlayingDialog';
import Static from './Static';
import useVideoSourceIcon from './useVideoSourceIcon';
import './Visualizer.scss';

export default memo(function VisualizerControls() {
    const currentVisualizer = useCurrentVisualizer();
    const currentVisualizers = useObservable(observeCurrentVisualizers, []);
    const reason = useObservable(observeNextVisualizerReason, 'sync');
    const locked = useObservable(observeLocked, false);
    const providerId = useObservable(observeProviderId, undefined);
    const hasVisualizers = providerId !== 'none';
    const isRandom = !providerId;
    const hasNext = !locked && (isRandom || currentVisualizers.length > 1);
    const videoIcon = useVideoSourceIcon();
    const [showStatic, setShowStatic] = useState(0);

    const openInfoDialog = useCallback(() => {
        showDialog(CurrentlyPlayingDialog);
    }, []);

    const openSettingsDialog = useCallback(() => {
        showDialog(VisualizerSettingsDialog, true);
    }, []);

    const handleNextClick = useCallback(() => {
        if (showStatic === 0) {
            nextVisualizer('click');
        }
        setShowStatic(showStatic + 1);
    }, [showStatic]);

    useEffect(() => {
        if (showStatic) {
            const subscription = timer(500).subscribe(() => setShowStatic(0));
            return () => subscription.unsubscribe();
        }
    }, [showStatic]);

    useEffect(() => {
        if (reason === 'provider') {
            setShowStatic(1);
        }
    }, [currentVisualizer, reason]);

    return (
        <div className="visualizer-controls">
            {hasVisualizers && showStatic ? <Static /> : null}
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
                            title="Change the visualizer"
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
