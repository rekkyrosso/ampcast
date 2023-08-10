import React, {memo, useCallback, useState} from 'react';
import Splitter from 'components/Splitter';
import MediaSources from 'components/MediaSources';
import {SettingsDialog} from 'components/Settings';
import {showDialog} from 'components/Dialog';
import Icon from 'components/Icon';
import AppDragRegion from 'components/App/AppDragRegion';
import IconButton from 'components/Button/IconButton';
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
                <h1 className="media-library-title">
                    <span className="app-name">
                        <Icon className="app-icon" name="ampcast" />
                        <span className="app-text">{__app_name__}</span>
                    </span>{' '}
                    <span className="app-version">{__app_version__}</span>
                </h1>
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
