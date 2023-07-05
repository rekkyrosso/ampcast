import React, {useCallback} from 'react';
import {nanoid} from 'nanoid';
import md5 from 'md5';
import {showDialog, DialogProps} from 'components/Dialog';
import LoginDialog from 'components/Login/LoginDialog';
import subsonicSettings from '../subsonicSettings';
import subsonic from '../subsonic';

export async function showSubsonicLoginDialog(): Promise<string> {
    return showDialog(SubsonicLoginDialog, true);
}

export default function SubsonicLoginDialog(props: DialogProps) {
    const login = useCallback(async (host: string, userName: string, password: string) => {
        const salt = nanoid(12);
        const token = md5(password + salt);

        const credentials = new URLSearchParams({
            u: userName,
            t: token,
            s: salt,
            v: '1.13.0',
            c: __app_name__,
            f: 'json',
        }).toString();

        const response = await fetch(`${host}/rest/ping?${credentials}`);

        if (!response.ok) {
            throw response;
        }

        const {['subsonic-response']: data} = await response.json();
        if (data.error) {
            throw Error(data.error.message || 'Failed');
        }

        return JSON.stringify({userName, credentials});
    }, []);

    return <LoginDialog {...props} service={subsonic} settings={subsonicSettings} login={login} />;
}
