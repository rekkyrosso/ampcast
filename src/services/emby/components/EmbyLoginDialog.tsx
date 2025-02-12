import React, {useCallback} from 'react';
import MediaService from 'types/MediaService';
import type {EmbySettings} from '../embySettings';
import {showDialog, DialogProps} from 'components/Dialog';
import LoginDialog from 'components/Login/LoginDialog';
import embyApi from '../embyApi';

export async function showEmbyLoginDialog(
    service: MediaService,
    settings: EmbySettings
): Promise<string> {
    return showDialog(
        (props: DialogProps) => (
            <EmbyLoginDialog {...props} service={service} settings={settings} />
        ),
        true
    );
}

export interface EmbyLoginDialogProps extends DialogProps {
    service: MediaService;
    settings: EmbySettings;
}

export default function EmbyLoginDialog({service, settings, ...props}: EmbyLoginDialogProps) {
    const login = useCallback(
        (host: string, userName: string, password: string, useProxy?: boolean) => {
            return embyApi.login(host, userName, password, useProxy, settings);
        },
        [settings]
    );

    return <LoginDialog {...props} service={service} settings={settings} login={login} />;
}
