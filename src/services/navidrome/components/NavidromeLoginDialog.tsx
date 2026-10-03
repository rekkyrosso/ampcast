import React, {useCallback} from 'react';
import {showDialog, DialogProps} from 'components/Dialog';
import LoginDialog from 'components/Login/LoginDialog';
import navidromeSettings from '../navidromeSettings';
import navidrome from '../navidrome';
import navidromeApi from '../navidromeApi';

export async function showNavidromeLoginDialog(onBeforeLogin?: () => void): Promise<string> {
    const password = await navidromeSettings.getPassword();
    return showDialog((props: DialogProps) => (
        <NavidromeLoginDialog {...props} password={password} onBeforeLogin={onBeforeLogin} />
    ));
}

export interface NavidromeLoginDialogProps extends DialogProps {
    password?: string;
    onBeforeLogin?: () => void;
}

export default function NavidromeLoginDialog(props: NavidromeLoginDialogProps) {
    const login = useCallback(
        (host: string, userName: string, password: string, useProxy?: boolean) => {
            return navidromeApi.login(host, userName, password, useProxy);
        },
        []
    );

    return (
        <LoginDialog {...props} service={navidrome} settings={navidromeSettings} login={login} />
    );
}
