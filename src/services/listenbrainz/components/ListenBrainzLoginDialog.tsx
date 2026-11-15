import React, {useCallback} from 'react';
import {showDialog, DialogProps} from 'components/Dialog';
import LoginDialog from 'components/Login/LoginDialog';
import listenbrainzSettings from '../listenbrainzSettings';
import listenbrainz from '../listenbrainz';

export async function showListenBrainzLoginDialog(): Promise<string> {
    return showDialog(ListenBrainzLoginDialog);
}

export default function ListenBrainzLoginDialog(props: DialogProps) {
    const login = useCallback(async (host: string, userName: string, token: string) => {
        const response = await fetch(`https://api.listenbrainz.org/1/validate-token`, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Token ${token}`,
            },
        });

        if (!response.ok) {
            throw response;
        }

        const {valid, user_name} = await response.json();

        if (!valid) {
            throw Error('Invalid token');
        }

        if (user_name !== userName) {
            throw Error('Token not valid for this user');
        }

        return JSON.stringify({userName, token});
    }, []);

    return (
        <LoginDialog
            {...props}
            service={listenbrainz}
            settings={listenbrainzSettings}
            login={login}
            helpUrl="https://listenbrainz.org/profile/"
            passwordLabel="Token"
        />
    );
}
