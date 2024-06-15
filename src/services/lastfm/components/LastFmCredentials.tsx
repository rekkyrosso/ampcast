import React, {useCallback, useId, useRef} from 'react';
import {lastfmCreateAppUrl} from 'services/constants';
import {error} from 'components/Dialog';
import AppCredentials from 'components/Settings/MediaLibrarySettings/AppCredentials';
import AppCredential from 'components/Settings/MediaLibrarySettings/AppCredential';
import ExternalLink from 'components/ExternalLink';
import Icon from 'components/Icon';
import lastfmSettings from '../lastfmSettings';
import lastfm from '../lastfm';
import useCredentials from './useCredentials';

export default function LastFmCredentials() {
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
    }, []);

    return (
        <AppCredentials className="lastfm-credentials" onSubmit={handleSubmit}>
            <fieldset>
                <legend>Your App</legend>
                <AppCredential
                    label="API Key"
                    name="lastfm-api-key"
                    defaultValue={apiKey}
                    inputRef={apiKeyRef}
                    autoFocus
                />
                <AppCredential
                    label="Shared Secret"
                    name="lastfm-secret"
                    defaultValue={secret}
                    inputRef={secretRef}
                />
            </fieldset>
            <fieldset>
                <legend>Registration</legend>
                <p className="lastfm-link service-link">
                    <ExternalLink href={lastfmCreateAppUrl}>
                        <Icon name="lastfm" />
                        {lastfmCreateAppUrl}
                    </ExternalLink>
                </p>
            </fieldset>
            <fieldset className="app-credentials-requirements note">
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
        </AppCredentials>
    );
}
