import React from 'react';
import Dialog, {DialogProps} from 'components/Dialog';
import ThemeSettings from './ThemeSettings';

export default function ThemeSettingsDialog(props: DialogProps) {
    return (
        <Dialog {...props} className="theme-settings-dialog" title="Theme Settings">
            <ThemeSettings />
        </Dialog>
    );
}
