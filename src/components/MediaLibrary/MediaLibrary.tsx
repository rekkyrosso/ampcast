import React, {useCallback, useState} from 'react';
import Splitter from 'components/Splitter';
import MediaSources from 'components/MediaSources';
import {SettingsDialog} from 'components/Settings';
import {showDialog} from 'components/Dialog';
import IconButton from 'components/Button/IconButton';
import './MediaLibrary.scss';

console.log('component::MediaLibrary');

export default function MediaLibrary() {
    const [source, setSource] = useState<React.ReactNode>(null);

    const openSettingsDialog = useCallback(() => {
        showDialog(SettingsDialog, true);
    }, []);

    return (
        <div className="media-library">
            <header className="media-library-head">
                <h1>
                    {__app_name__} <span className="version">{__app_version__}</span>
                </h1>
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
                    {source}
                </Splitter>
            </div>
        </div>
    );
}
