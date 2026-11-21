import React, {useCallback, useRef} from 'react';
import {copyToClipboard, Logger} from 'utils';
import {CopyButton} from 'components/Button';
import {DialogButtons, error} from 'components/Dialog';
import CredentialsInput from 'components/Settings/MediaLibrarySettings/CredentialsInput';
import CredentialsRegistration from 'components/Settings/MediaLibrarySettings/CredentialsRegistration';
import {MediaServiceCredentialsProps} from 'components/Settings/MediaLibrarySettings/MediaServiceCredentials';
import soundcloudSettings from '../soundcloudSettings';
import useCredentials from './useCredentials';

const logger = new Logger('SoundCloudCredentials');

export default function SoundCloudCredentials({service: soundcloud}: MediaServiceCredentialsProps) {
    const {clientId, secret} = useCredentials();
    const clientIdRef = useRef<HTMLInputElement>(null);
    const secretRef = useRef<HTMLInputElement>(null);
    const callbackUrl = soundcloudSettings.redirectUri;
    const locked = soundcloud.credentialsLocked;

    const handleSubmit = useCallback(async () => {
        const clientId = clientIdRef.current!.value;
        const secret = secretRef.current!.value;
        const currentSecret = await soundcloudSettings.getSecret();
        if (clientId !== soundcloudSettings.clientId || secret !== currentSecret) {
            soundcloudSettings.clientId = clientId;
            if (secret !== currentSecret) {
                try {
                    await soundcloudSettings.setSecret(secret);
                } catch (err: any) {
                    logger.error(err);
                    await error('Failed to store secret.');
                }
            }
            if (soundcloud.isLoggedIn()) {
                await soundcloud.logout();
            }
        }
    }, [soundcloud]);

    return (
        <form
            className="soundcloud-credentials"
            method="dialog"
            onSubmit={locked ? undefined : handleSubmit}
        >
            <CredentialsRegistration service={soundcloud} />
            <fieldset>
                <legend>Your App</legend>
                <CredentialsInput
                    locked={locked}
                    label="Client ID"
                    name="soundcloud-client-id"
                    defaultValue={clientId}
                    inputRef={clientIdRef}
                    autoFocus
                />
                {locked ? null : (
                    <CredentialsInput
                        locked={soundcloud.credentialsLocked}
                        label="Client Secret"
                        name="soundcloud-secret"
                        defaultValue={secret}
                        inputRef={secretRef}
                    />
                )}
            </fieldset>
            <fieldset className="credentials-requirements note">
                <legend>Requirements</legend>
                <p>Redirect URI:</p>
                <p className="credentials-callback">
                    <input type="text" value={callbackUrl} readOnly />
                    <CopyButton onClick={() => copyToClipboard(callbackUrl)} />
                </p>
            </fieldset>
            <DialogButtons />
        </form>
    );
}
