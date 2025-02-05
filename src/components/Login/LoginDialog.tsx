import React, {useCallback, useEffect, useRef, useState} from 'react';
import MediaService from 'types/MediaService';
import {Logger} from 'utils';
import Dialog, {DialogProps} from 'components/Dialog';
import DialogButtons from 'components/Dialog/DialogButtons';
import './LoginDialog.scss';

const logger = new Logger('LoginDialog');

export interface LoginDialogProps extends DialogProps {
    service: MediaService;
    settings: {host: string};
    userName?: string;
    login: (host: string, userName: string, password: string) => Promise<string>;
}

export default function LoginDialog({
    service,
    settings,
    userName = '',
    login,
    ...props
}: LoginDialogProps) {
    const id = service.id;
    const [connecting, setConnecting] = useState(false);
    const [message, setMessage] = useState('');
    const dialogRef = useRef<HTMLDialogElement>(null);
    const hostRef = useRef<HTMLInputElement>(null);
    const userNameRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);

    const submit = useCallback(async () => {
        try {
            const host = hostRef.current!.value.trim().replace(/\/+$/, '');
            const userName = userNameRef.current!.value.trim();
            const password = passwordRef.current!.value.trim();

            settings.host = host;

            setConnecting(true);
            setMessage('Connecting...');

            if (location.protocol === 'https:' && !host.startsWith('https:')) {
                throw Error('https required');
            }

            const credentials = await login(host, userName, password);

            dialogRef.current!.close(credentials);
        } catch (err: any) {
            logger.error(err);
            setConnecting(false);
            if (err instanceof TypeError) {
                setMessage('Host not available');
            } else {
                setMessage(err.message || err.statusText || 'Error');
            }
        }
    }, [settings, login]);

    const handleSubmit = useCallback(
        (event: React.FormEvent) => {
            event.preventDefault();
            submit();
        },
        [submit]
    );

    useEffect(() => {
        if (settings.host) {
            userNameRef.current?.focus();
        }
    }, [settings]);

    return (
        <Dialog
            {...props}
            className={`login-dialog login-dialog-${id}`}
            icon={service.icon}
            title={`Log in to ${service.name}`}
            ref={dialogRef}
        >
            <form id={`${id}-login`} method="dialog" onSubmit={handleSubmit}>
                <div className="table-layout">
                    <p>
                        <label htmlFor={`${id}-host`}>Host:</label>
                        <input
                            type="url"
                            id={`${id}-host`}
                            name={`${id}-host`}
                            defaultValue={settings.host}
                            placeholder={`${location.protocol}//`}
                            autoComplete={`section-${id} url`}
                            required
                            ref={hostRef}
                        />
                    </p>
                    <p>
                        <label htmlFor={`${id}-username`}>User:</label>
                        <input
                            type="text"
                            id={`${id}-username`}
                            name={`${id}-username`}
                            defaultValue={userName || ''}
                            spellCheck={false}
                            autoComplete={`section-${id} username`}
                            autoCapitalize="off"
                            required
                            ref={userNameRef}
                        />
                    </p>
                    <p>
                        <label htmlFor={`${id}-password`}>Password:</label>
                        <input
                            type="password"
                            id={`${id}-password`}
                            name={`${id}-password`}
                            ref={passwordRef}
                            autoComplete={`section-${id} current-password`}
                            required
                        />
                    </p>
                </div>
                <p className={`message ${connecting ? '' : 'error'}`}>{message}</p>
                <DialogButtons submitText="Login" />
            </form>
        </Dialog>
    );
}
