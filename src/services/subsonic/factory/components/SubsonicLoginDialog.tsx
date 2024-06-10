import React, {useCallback} from 'react';
import {nanoid} from 'nanoid';
import md5 from 'md5';
import {showDialog, DialogProps} from 'components/Dialog';
import LoginDialog from 'components/Login/LoginDialog';
import {Logger} from 'utils';
import SubsonicService from '../SubsonicService';
import './SubsonicLoginDialog.scss';

const logger = new Logger('SubsonicLoginDialog');

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

    const login = useCallback(async (host: string, userName: string, password: string) => {
        const ping = async (params: Record<string, string>): Promise<string> => {
            const credentials = new URLSearchParams({
                u: userName,
                ...params,
                c: __app_name__,
                f: 'json',
            });

            const response = await fetch(`${host}/rest/ping?${credentials}`);
            if (!response.ok) {
                throw response;
            }

            const {['subsonic-response']: data} = await response.json();
            if (data.error) {
                throw data.error;
            }

            credentials.set('v', data.version || credentials.get('v'));

            return JSON.stringify({userName, credentials: credentials.toString()});
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
                // Wrong username or password.
                throw err;
            }
            logger.log('Login failed. Attempting legacy login....');
            const details = await ping({
                p: `enc:${Array.from(new TextEncoder().encode(password))
                    .map((byte) => byte.toString(16).padStart(2, '0'))
                    .join('')}`,
                v: '1.12.0',
            });
            return details;
        }
    }, []);

    return (
        <LoginDialog
            {...props}
            service={service}
            settings={settings}
            userName={settings.userName}
            login={login}
        />
    );
}
