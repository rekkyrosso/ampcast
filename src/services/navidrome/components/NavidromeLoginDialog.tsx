import React, {useCallback} from 'react';
import {showDialog, DialogProps} from 'components/Dialog';
import LoginDialog from 'components/Login/LoginDialog';
import navidromeSettings from '../navidromeSettings';
import navidrome from '../navidrome';

export async function showNavidromeLoginDialog(): Promise<string> {
    return showDialog(NavidromeLoginDialog, true);
}

export default function NavidromeLoginDialog(props: DialogProps) {
    const login = useCallback(async (host: string, username: string, password: string) => {
        const response = await fetch(`${host}/auth/login`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username, password}),
        });

        if (!response.ok) {
            throw response;
        }

        const {token, subsonicSalt, subsonicToken, id: userId} = await response.json();
        const credentials = `u=${username}&s=${subsonicSalt}&t=${subsonicToken}&v=1.16.1&c=${__app_name__}&f=json`;

        return JSON.stringify({
            userId,
            token,
            credentials,
        });
    }, []);

    return (
        <LoginDialog {...props} service={navidrome} settings={navidromeSettings} login={login} />
    );
}
