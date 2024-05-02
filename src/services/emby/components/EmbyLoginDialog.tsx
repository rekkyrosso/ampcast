import React, {useCallback} from 'react';
import MediaService from 'types/MediaService';
import {showDialog, DialogProps} from 'components/Dialog';
import LoginDialog from 'components/Login/LoginDialog';
import embySettings, {EmbySettings} from '../embySettings';
import emby from '../emby';

export async function showEmbyLoginDialog(
    service: MediaService = emby,
    settings: EmbySettings = embySettings
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
        async (host: string, userName: string, password: string) => {
            const {device, deviceId} = settings;
            const apiHost = service.id === 'emby' ? `${host}/emby` : host;
            const authorization = `MediaBrowser Client="${__app_name__}", Version="${__app_version__}", Device="${device}", DeviceId="${deviceId}"`;
            const response = await fetch(`${apiHost}/Users/AuthenticateByName`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Emby-Authorization': authorization,
                },
                body: JSON.stringify({
                    Username: userName,
                    Pw: password,
                }),
            });

            if (!response.ok) {
                throw response;
            }

            const auth = await response.json();
            const serverId = auth.ServerId;
            const userId = auth.User.Id;
            const token = auth.AccessToken;

            return JSON.stringify({serverId, userId, token});
        },
        [service, settings]
    );

    return <LoginDialog {...props} service={service} settings={settings} login={login} />;
}
