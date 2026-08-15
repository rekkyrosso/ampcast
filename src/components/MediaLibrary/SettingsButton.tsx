import React, {useCallback} from 'react';
import {IconButton} from 'components/Button';
import {SettingsDialog} from 'components/Settings';
import {showDialog} from 'components/Dialog';

export default function SettingsButton() {
    const openSettingsDialog = useCallback(() => {
        showDialog(SettingsDialog, true);
    }, []);

    return <IconButton icon="settings" title="Settings" onClick={openSettingsDialog} />;
}
