import React, {useCallback} from 'react';
import {showDialog, DialogProps} from 'components/Dialog';
import LoginDialog from 'components/Login/LoginDialog';
import navidromeSettings from '../navidromeSettings';
import navidrome from '../navidrome';
import navidromeApi from '../navidromeApi';

export async function showNavidromeLoginDialog(): Promise<string> {
    return showDialog(NavidromeLoginDialog, true);
}

export default function NavidromeLoginDialog(props: DialogProps) {
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
