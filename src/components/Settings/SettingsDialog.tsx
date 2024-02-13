import React, {useState} from 'react';
import {LiteStorage} from 'utils';
import Dialog, {DialogProps} from 'components/Dialog';
import MediaSourceLabel from 'components/MediaSources/MediaSourceLabel';
import TreeView from 'components/TreeView';
import './SettingsDialog.scss'; // Needs to be above the file below.
import useSettingsSources from './useSettingsSources';

export const storage = new LiteStorage('settings-sources');

export default function SettingsDialog(props: DialogProps) {
    const sources = useSettingsSources();
    const [source, setSource] = useState<React.ReactNode>(null);

    return (
        <Dialog
            {...props}
            className="settings-dialog"
            title={<MediaSourceLabel icon="settings" text="Settings" />}
        >
            <TreeView<React.ReactNode>
                className="settings-dialog-sources"
                roots={sources}
                storageId={storage.id}
                onSelect={setSource}
            />
            <div className="settings-dialog-source">{source}</div>
        </Dialog>
    );
}
