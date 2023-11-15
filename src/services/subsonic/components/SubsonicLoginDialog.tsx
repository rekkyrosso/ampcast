import React, {useCallback} from 'react';
import {nanoid} from 'nanoid';
import md5 from 'md5';
import {showDialog, DialogProps} from 'components/Dialog';
import LoginDialog from 'components/Login/LoginDialog';
import subsonicSettings from '../subsonicSettings';
import subsonic from '../subsonic';
import {Logger} from 'utils';
import './SubsonicLoginDialog.scss';

const logger = new Logger('SubsonicLoginDialog');

export async function showSubsonicLoginDialog(): Promise<string> {
    return showDialog(SubsonicLoginDialog, true);
}

export default function SubsonicLoginDialog(props: DialogProps) {
    const login = useCallback(async (host: string, userName: string, password: string) => {
        const ping = async (params: Record<string, string>): Promise<string> => {
            const credentials = new URLSearchParams({
                u: userName,
                ...params,
                c: __app_name__,
                f: 'json',
            }).toString();

            const response = await fetch(`${host}/rest/ping?${credentials}`);
            if (!response.ok) {
                throw response;
            }

            const {['subsonic-response']: data} = await response.json();
            if (data.error) {
                throw data.error;
            }

            return JSON.stringify({userName, credentials});
        };

        try {
            const salt = nanoid(12);
            const token = md5(password + salt);
            const details = await ping({
                t: token,
                s: salt,
                v: '1.13.0',
            });
            return details;
        } catch (err: any) {
            if (err.code === 40) {
                throw err;
            }
            logger.log('Login failed. Attempting legacy login....');
            const details = await ping({
                p: password,
                v: '1.12.0',
            });
            return details;
        }
    }, []);

    return (
        <LoginDialog
            {...props}
            service={subsonic}
            settings={subsonicSettings}
            userName={subsonicSettings.userName}
            login={login}
        />
    );
}
