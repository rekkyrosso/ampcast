import React, {useCallback, useEffect, useRef, useState} from 'react';
import MediaService from 'types/MediaService';
import {Logger} from 'utils';
import ampcastElectron from 'services/ampcastElectron';
import {hasProxyLogin, isServerLocked} from 'services/mediaServices/buildConfig';
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
        savePassword?(password: string): Promise<void>;
    };
    login: (
        host: string,
        userName: string,
        password: string,
        useProxy?: boolean
    ) => Promise<string>;
    password?: string;
    onBeforeLogin?: () => void;
}

export default function LoginDialog({
    service,
    settings,
    login,
    password,
    onBeforeLogin,
    ...props
}: LoginDialogProps) {
    const serviceId = service.id;
    const [connecting, setConnecting] = useState(false);
    const [message, setMessage] = useState('');
    const dialogRef = useRef<HTMLDialogElement>(null);
    const hostRef = useRef<HTMLInputElement>(null);
    const userNameRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const savePasswordRef = useRef<HTMLInputElement>(null);
    const useProxyRef = useRef<HTMLInputElement>(null);
    const canUseProxy = hasProxyLogin(serviceId);
    const locked = isServerLocked(serviceId);
    const useManualLogin = settings.useManualLogin && !locked;
    const [useProxy, setUseProxy] = useState(() => canUseProxy && !useManualLogin);
    const initialUseProxy = useFirstValue(useProxy);

    const submit = useCallback(async () => {
        try {
            const host = hostRef.current!.value.trim().replace(/\/+$/, '');
            const userName = useProxy ? '' : userNameRef.current!.value.trim();
            const password = useProxy ? '' : passwordRef.current!.value.trim();

            // Save for auto-completion.
            settings.host = host;
            if ('useManualLogin' in settings) {
                settings.useManualLogin = !useProxy;
            }
            if ('userName' in settings) {
                settings.userName = userName;
            }
            if (ampcastElectron && settings.savePassword) {
                await settings.savePassword(savePasswordRef.current?.checked ? password : '');
            }

            onBeforeLogin?.();
            setConnecting(true);
            setMessage('Connecting...');

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
    }, [settings, onBeforeLogin, login, useProxy]);

    const handleSubmit = useCallback(
        (event: React.SubmitEvent) => {
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
            className={`login-dialog login-dialog-${serviceId}`}
            icon={service.icon}
            title={`Connect to ${service.name}`}
            ref={dialogRef}
        >
            <form id={`${serviceId}-login`} method="dialog" onSubmit={handleSubmit}>
                {canUseProxy ? (
                    <>
                        <p>
                            <input
                                type="radio"
                                name={`${serviceId}-login-type`}
                                id={`${serviceId}-login-proxy`}
                                defaultChecked={!useManualLogin}
                                onChange={handleLoginTypeChange}
                                ref={useProxyRef}
                            />
                            <label htmlFor={`${serviceId}-login-proxy`}>Default login</label>
                        </p>
                        <p>
                            <input
                                type="radio"
                                name={`${serviceId}-login-type`}
                                id={`${serviceId}-login-manual`}
                                defaultChecked={useManualLogin}
                                disabled={locked}
                                onChange={handleLoginTypeChange}
                            />
                            <label htmlFor={`${serviceId}-login-manual`}>Advanced login:</label>
                        </p>
                    </>
                ) : null}
                <div className="table-layout">
                    <p>
                        <label htmlFor={`${serviceId}-host`}>Host:</label>
                        <input
                            type="url"
                            id={`${serviceId}-host`}
                            name={`${serviceId}-host`}
                            defaultValue={settings.host}
                            disabled={useProxy}
                            placeholder="http://"
                            autoComplete={useProxy ? 'off' : `section-${serviceId} url`}
                            readOnly={locked}
                            required
                            ref={hostRef}
                        />
                    </p>
                    <p>
                        <label htmlFor={`${serviceId}-username`}>User:</label>
                        <input
                            type="text"
                            id={`${serviceId}-username`}
                            name={`${serviceId}-username`}
                            defaultValue={initialUseProxy ? '' : settings.userName}
                            disabled={useProxy}
                            spellCheck={false}
                            autoComplete={useProxy ? 'off' : `section-${serviceId} username`}
                            autoCapitalize="off"
                            required
                            ref={userNameRef}
                        />
                    </p>
                    <p>
                        <label htmlFor={`${serviceId}-password`}>Password:</label>
                        <input
                            type="password"
                            id={`${serviceId}-password`}
                            name={`${serviceId}-password`}
                            defaultValue={password}
                            disabled={useProxy}
                            ref={passwordRef}
                            autoComplete={
                                useProxy ? 'off' : `section-${serviceId} current-password`
                            }
                            required
                        />
                    </p>
                </div>
                {ampcastElectron && settings.savePassword ? (
                    <p className="save-password">
                        <label htmlFor={`${serviceId}-save-password`}>save password</label>
                        <input
                            id={`${serviceId}-save-password`}
                            type="checkbox"
                            defaultChecked={!!password}
                            ref={savePasswordRef}
                        />
                    </p>
                ) : null}
                <p className={`message ${connecting ? '' : 'error'}`}>{message}</p>
                <DialogButtons submitText="Connect" />
            </form>
        </Dialog>
    );
}
