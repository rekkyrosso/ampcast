import React, {useCallback, useEffect, useRef, useState} from 'react';
import MediaService from 'types/MediaService';
import {Logger} from 'utils';
import {hasProxyLogin} from 'services/buildConfig';
import Dialog, {DialogProps} from 'components/Dialog';
import DialogButtons from 'components/Dialog/DialogButtons';
import useFirstValue from 'hooks/useFirstValue';
import './LoginDialog.scss';

const logger = new Logger('LoginDialog');

export interface LoginDialogProps extends DialogProps {
    service: MediaService;
    settings: {
        host: string;
        userName?: string;
        useManualLogin?: boolean;
    };
    login: (
        host: string,
        userName: string,
        password: string,
        useProxy?: boolean
    ) => Promise<string>;
}

export default function LoginDialog({service, settings, login, ...props}: LoginDialogProps) {
    const id = service.id;
    const [connecting, setConnecting] = useState(false);
    const [message, setMessage] = useState('');
    const dialogRef = useRef<HTMLDialogElement>(null);
    const hostRef = useRef<HTMLInputElement>(null);
    const userNameRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const useProxyRef = useRef<HTMLInputElement>(null);
    const canUseProxy = hasProxyLogin(service.id);
    const [useProxy, setUseProxy] = useState(() => canUseProxy && !settings.useManualLogin);
    const initialUseProxy = useFirstValue(useProxy);

    const submit = useCallback(async () => {
        try {
            const host = hostRef.current!.value.trim().replace(/\/+$/, '');
            const userName = useProxy ? '' : userNameRef.current!.value.trim();
            const password = useProxy ? '' : passwordRef.current!.value.trim();

            // Save for auto-completion.
            settings.host = host;
            if ('userName' in settings) {
                settings.userName = userName;
            }
            if ('useManualLogin' in settings) {
                settings.useManualLogin = !useProxy;
            }

            setConnecting(true);
            setMessage('Connecting...');

            if (location.protocol === 'https:' && !host.startsWith('https:')) {
                throw Error('https required');
            }

            const credentials = await login(host, userName, password, useProxy);

            dialogRef.current!.close(credentials);
        } catch (err: any) {
            logger.error(err);
            setConnecting(false);
            if (err instanceof TypeError) {
                setMessage('Host not available');
            } else {
                setMessage(
                    err.message ||
                        err.statusText ||
                        (typeof err === 'string' ? err : 'Unauthorized')
                );
            }
        }
    }, [settings, login, useProxy]);

    const handleSubmit = useCallback(
        (event: React.FormEvent) => {
            event.preventDefault();
            submit();
        },
        [submit]
    );

    const handleLoginTypeChange = useCallback(() => {
        setUseProxy(useProxyRef.current!.checked);
    }, []);

    useEffect(() => {
        if (!initialUseProxy) {
            if (settings.host) {
                if (settings.userName) {
                    passwordRef.current?.focus();
                } else {
                    userNameRef.current?.focus();
                }
            } else {
                hostRef.current?.focus();
            }
        }
    }, [settings, initialUseProxy]);

    return (
        <Dialog
            {...props}
            className={`login-dialog login-dialog-${id}`}
            icon={service.icon}
            title={`Log in to ${service.name}`}
            ref={dialogRef}
        >
            <form id={`${id}-login`} method="dialog" onSubmit={handleSubmit}>
                {canUseProxy ? (
                    <>
                        <p>
                            <input
                                type="radio"
                                name={`${id}-login-type`}
                                id={`${id}-login-proxy`}
                                defaultChecked={!settings.useManualLogin}
                                onChange={handleLoginTypeChange}
                                ref={useProxyRef}
                            />
                            <label htmlFor={`${id}-login-proxy`}>Default login</label>
                        </p>
                        <p>
                            <input
                                type="radio"
                                name={`${id}-login-type`}
                                id={`${id}-login-manual`}
                                defaultChecked={settings.useManualLogin}
                                onChange={handleLoginTypeChange}
                            />
                            <label htmlFor={`${id}-login-manual`}>Advanced login:</label>
                        </p>
                    </>
                ) : null}
                <div className="table-layout">
                    <p>
                        <label htmlFor={`${id}-host`}>Host:</label>
                        <input
                            type="url"
                            id={`${id}-host`}
                            name={`${id}-host`}
                            defaultValue={settings.host}
                            disabled={useProxy}
                            placeholder={`${location.protocol}//`}
                            autoComplete={useProxy ? 'off' : `section-${id} url`}
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
                            defaultValue={initialUseProxy ? '' : settings.userName}
                            disabled={useProxy}
                            spellCheck={false}
                            autoComplete={useProxy ? 'off' : `section-${id} username`}
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
                            disabled={useProxy}
                            ref={passwordRef}
                            autoComplete={useProxy ? 'off' : `section-${id} current-password`}
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
