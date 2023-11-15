import React, {memo, useCallback, useState} from 'react';
import AppTitle from 'components/App/AppTitle';
import Splitter from 'components/Splitter';
import {SettingsDialog} from 'components/Settings';
import {showDialog} from 'components/Dialog';
import AppDragRegion from 'components/App/AppDragRegion';
import IconButton from 'components/Button/IconButton';
import MediaSources from 'components/MediaSources';
import EmptyScreen from 'components/EmptyScreen';
import './MediaLibrary.scss';

export default memo(function MediaLibrary() {
    const [source, setSource] = useState<React.ReactNode>(null);

    const openSettingsDialog = useCallback(() => {
        showDialog(SettingsDialog, true);
    }, []);

    return (
        <div className="media-library">
            <header className="media-library-head">
                <AppTitle />
                <AppDragRegion />
                <IconButton
                    icon="settings"
                    className="in-frame"
                    title="Settings"
                    onClick={openSettingsDialog}
                />
            </header>
            <div className="media-library-body">
                <Splitter id="media-library-layout" arrange="columns" primaryIndex={1}>
                    <MediaSources onSelect={setSource} />
                    {source || <EmptyScreen />}
                </Splitter>
            </div>
        </div>
    );
});
