import React, {useState} from 'react';
import Dialog, {DialogProps} from 'components/Dialog';
import TreeView from 'components/TreeView';
import useSettingsSources from './useSettingsSources';
import './SettingsDialog.scss';

export default function SettingsDialog(props: DialogProps) {
    const sources = useSettingsSources();
    const [source, setSource] = useState<React.ReactNode>(<div />);

    return (
        <Dialog {...props} className="settings-dialog" title="Settings">
            <TreeView
                className="settings-dialog-sources"
                roots={sources}
                storeId="settings-dialog-sources"
                onSelect={setSource}
            />
            <div className="settings-dialog-source">{source}</div>
        </Dialog>
    );
}
