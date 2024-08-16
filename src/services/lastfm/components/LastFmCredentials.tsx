import React, {useCallback, useId, useRef} from 'react';
import {error} from 'components/Dialog';
import DialogButtons from 'components/Dialog/DialogButtons';
import Credentials from 'components/Settings/MediaLibrarySettings/Credentials';
import {MediaServiceCredentialsProps} from 'components/Settings/MediaLibrarySettings/MediaServiceCredentials';
import ExternalLink from 'components/ExternalLink';
import lastfmSettings from '../lastfmSettings';
import useCredentials from './useCredentials';

export default function LastFmCredentials({service: lastfm}: MediaServiceCredentialsProps) {
    const id = useId();
    const {apiKey, secret} = useCredentials();
    const apiKeyRef = useRef<HTMLInputElement>(null);
    const secretRef = useRef<HTMLInputElement>(null);

    const handleSubmit = useCallback(async () => {
        const apiKey = apiKeyRef.current!.value;
        const secret = secretRef.current!.value;
        const currentSecret = await lastfmSettings.getSecret();
        if (apiKey !== lastfmSettings.apiKey || secret !== currentSecret) {
            lastfmSettings.apiKey = apiKey;
            if (secret !== currentSecret) {
                try {
                    await lastfmSettings.setSecret(secret);
                } catch (err: any) {
                    console.error(err);
                    await error('Failed to store secret.');
                }
            }
            if (lastfm.isLoggedIn()) {
                await lastfm.logout();
            }
        }
    }, [lastfm]);

    return (
        <form className="lastfm-credentials" method="dialog" onSubmit={handleSubmit}>
            <fieldset>
                <legend>Your App</legend>
                <Credentials
                    label="API Key"
                    name="lastfm-api-key"
                    defaultValue={apiKey}
                    inputRef={apiKeyRef}
                    autoFocus
                />
                <Credentials
                    label="Shared Secret"
                    name="lastfm-secret"
                    defaultValue={secret}
                    inputRef={secretRef}
                />
            </fieldset>
            <fieldset className="credentials-registration">
                <legend>Registration</legend>
                <p>
                    <ExternalLink icon="lastfm" href={lastfm.credentialsUrl} />
                </p>
            </fieldset>
            <fieldset className="credentials-requirements note">
                <legend>Requirements</legend>
                <p>
                    <label htmlFor={`${id}-callback`}>Callback URL:</label>
                    <input
                        type="text"
                        id={`${id}-callback`}
                        value={`${location.origin}/auth/lastfm/callback/`}
                        readOnly
                    />
                </p>
            </fieldset>
            <DialogButtons />
        </form>
    );
}
