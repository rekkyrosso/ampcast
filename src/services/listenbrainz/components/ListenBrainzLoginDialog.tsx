import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Logger} from 'utils';
import Dialog, {showDialog, DialogProps} from 'components/Dialog';
import ExternalLink from 'components/ExternalLink';
import DialogButtons from 'components/Dialog/DialogButtons';
import listenbrainzSettings from '../listenbrainzSettings';
import listenbrainz from '../listenbrainz';
import './ListenBrainzLoginDialog.scss';

const logger = new Logger('ListenBrainzLoginDialog');

export async function showListenBrainzLoginDialog(): Promise<string> {
    return showDialog(ListenBrainzLoginDialog, true);
}

export default function ListenBrainzLoginDialog(props: DialogProps) {
    const id = listenbrainz.id;
    const [connecting, setConnecting] = useState(false);
    const [message, setMessage] = useState('');
    const dialogRef = useRef<HTMLDialogElement>(null);
    const userNameRef = useRef<HTMLInputElement>(null);
    const tokenRef = useRef<HTMLInputElement>(null);
    const profileUrl = 'https://listenbrainz.org/profile/';

    const login = useCallback(async () => {
        try {
            const userId = userNameRef.current!.value;
            const token = tokenRef.current!.value;

            listenbrainzSettings.userId = userId;

            setConnecting(true);
            setMessage('Connecting…');

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

            if (user_name !== userId) {
                throw Error('Token not valid for this user');
            }

            setMessage('');

            dialogRef.current!.close(JSON.stringify({userId, token}));
        } catch (err: any) {
            logger.error(err);
            setMessage(err.message || err.statusText || 'Error');
        }
        setConnecting(false);
    }, []);

    const handleSubmit = useCallback(
        (event: React.FormEvent) => {
            event.preventDefault();
            login();
        },
        [login]
    );

    useEffect(() => {
        userNameRef.current?.focus();
    }, []);

    return (
        <Dialog
            {...props}
            className="listenbrainz-login-dialog login-dialog"
            icon={listenbrainz.icon}
            title={`Log in to ${listenbrainz.name}`}
            ref={dialogRef}
        >
            <form id={`${id}-login`} method="dialog" onSubmit={handleSubmit}>
                <p className="listenbrainz-link">
                    <ExternalLink icon="listenbrainz" href={profileUrl} />
                </p>
                <div className="table-layout">
                    <p>
                        <label htmlFor={`${id}-username`}>User:</label>
                        <input
                            type="text"
                            id={`${id}-username`}
                            name={`${id}-username`}
                            autoFocus
                            required
                            spellCheck={false}
                            autoComplete={`section-${id} username`}
                            autoCapitalize="off"
                            ref={userNameRef}
                        />
                    </p>
                    <p>
                        <label htmlFor={`${id}-password`}>Token:</label>
                        <input
                            type="password"
                            id={`${id}-password`}
                            name={`${id}-password`}
                            required
                            autoComplete={`section-${id} current-password`}
                            ref={tokenRef}
                        />
                    </p>
                </div>
                <p className={`message ${connecting ? '' : 'error'}`}>{message}</p>
                <DialogButtons submitText="Login" />
            </form>
        </Dialog>
    );
}
