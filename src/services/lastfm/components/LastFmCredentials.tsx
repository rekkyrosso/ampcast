import React, {useCallback, useState} from 'react';
import {copyToClipboard, Logger} from 'utils';
import {CopyButton} from 'components/Button';
import {DialogButtons, error} from 'components/Dialog';
import CredentialsInput from 'components/Settings/MediaLibrarySettings/CredentialsInput';
import CredentialsRegistration from 'components/Settings/MediaLibrarySettings/CredentialsRegistration';
import {MediaServiceCredentialsProps} from 'components/Settings/MediaLibrarySettings/MediaServiceCredentials';
import lastfmSettings from '../lastfmSettings';
import useCredentials from './useCredentials';

const logger = new Logger('LastFmCredentials');

export default function LastFmCredentials({service: lastfm}: MediaServiceCredentialsProps) {
    const credentials = useCredentials();
    const [apiKey, setApiKey] = useState(credentials.apiKey);
    const [secret, setSecret] = useState(credentials.secret);
    const callbackUrl = `${location.origin}/auth/lastfm/callback/`;
    const locked = lastfm.credentialsLocked;

    const handleSubmit = useCallback(async () => {
        const currentSecret = await lastfmSettings.getSecret();
        if (apiKey !== lastfmSettings.apiKey || secret !== currentSecret) {
            lastfmSettings.apiKey = apiKey;
            if (secret !== currentSecret) {
                try {
                    await lastfmSettings.setSecret(secret);
                } catch (err: any) {
                    logger.error(err);
                    await error('Failed to store secret.');
                }
            }
            if (lastfm.isLoggedIn()) {
                await lastfm.logout();
            }
        }
    }, [lastfm, apiKey, secret]);

    return (
        <form
            className="lastfm-credentials"
            method="dialog"
            onSubmit={locked ? undefined : handleSubmit}
        >
            <CredentialsRegistration service={lastfm} />
            <fieldset>
                <legend>Your App</legend>
                <CredentialsInput
                    locked={locked}
                    label="API Key"
                    name="lastfm-api-key"
                    defaultValue={apiKey}
                    onChange={setApiKey}
                    secret
                />
                {locked ? null : (
                    <CredentialsInput
                        label="Shared Secret"
                        name="lastfm-secret"
                        defaultValue={secret}
                        onChange={setSecret}
                        secret
                    />
                )}
            </fieldset>
            <fieldset className="credentials-requirements note">
                <legend>Requirements</legend>
                <div className="requirement">
                    <p>Callback URL:</p>
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
