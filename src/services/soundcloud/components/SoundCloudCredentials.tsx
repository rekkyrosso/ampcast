import React, {useCallback, useState} from 'react';
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
    const credentials = useCredentials();
    const [clientId, setClientId] = useState(credentials.clientId);
    const [secret, setSecret] = useState(credentials.secret);
    const callbackUrl = soundcloudSettings.redirectUri;
    const locked = soundcloud.credentialsLocked;

    const handleSubmit = useCallback(async () => {
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
    }, [soundcloud, clientId, secret]);

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
                    onChange={setClientId}
                    autoFocus
                />
                {locked ? null : (
                    <CredentialsInput
                        label="Client Secret"
                        name="soundcloud-secret"
                        defaultValue={secret}
                        onChange={setSecret}
                        secret
                    />
                )}
            </fieldset>
            <fieldset className="credentials-requirements note">
                <legend>Requirements</legend>
                <div className="requirement">
                    <p>Redirect URI:</p>
                    <p className="credentials-callback">
                        <input type="text" value={callbackUrl} readOnly />
                        <CopyButton onClick={() => copyToClipboard(callbackUrl)} />
                    </p>
                </div>
            </fieldset>
            <DialogButtons />
        </form>
    );
}
