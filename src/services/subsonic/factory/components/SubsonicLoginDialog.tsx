import React, {useCallback} from 'react';
import {showDialog, DialogProps} from 'components/Dialog';
import LoginDialog from 'components/Login/LoginDialog';
import SubsonicService from '../SubsonicService';
import './SubsonicLoginDialog.scss';

export async function showSubsonicLoginDialog(service: SubsonicService): Promise<string> {
    return showDialog(
        (props: DialogProps) => <SubsonicLoginDialog {...props} service={service} />,
        true
    );
}

export type SubsonicLoginDialogProps = DialogProps & {
    service: SubsonicService;
};

export default function SubsonicLoginDialog({service, ...props}: SubsonicLoginDialogProps) {
    const settings = service.settings;

    const login = useCallback(
        (host: string, userName: string, password: string, useProxy?: boolean) => {
            return service.api.login(host, userName, password, useProxy);
        },
        [service]
    );

    return <LoginDialog {...props} service={service} settings={settings} login={login} />;
}
