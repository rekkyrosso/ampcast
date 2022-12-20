import React, {useState} from 'react';
import Dialog, {DialogProps} from 'components/Dialog';
import TreeView from 'components/TreeView';
import './SettingsDialog.scss'; // Needs to be above the file below.
import useSettingsSources from './useSettingsSources';

export default function SettingsDialog(props: DialogProps) {
    const sources = useSettingsSources();
    const [source, setSource] = useState<React.ReactNode>(null);

    return (
        <Dialog {...props} className="settings-dialog" title="Settings">
            <TreeView<React.ReactNode>
                className="settings-dialog-sources"
                roots={sources}
                storeId="settings-dialog-sources"
                onSelect={setSource}
            />
            <div className="settings-dialog-source">{source}</div>
        </Dialog>
    );
}
