import React, {useCallback, useId, useRef} from 'react';
import {lastfmCreateAppUrl} from 'services/constants';
import {lf_api_key} from 'services/credentials';
import AppCredentials from 'components/Settings/MediaLibrarySettings/AppCredentials';
import AppCredential from 'components/Settings/MediaLibrarySettings/AppCredential';
import ExternalLink from 'components/ExternalLink';
import Icon from 'components/Icon';
import lastfmSettings from '../lastfmSettings';
import lastfm from '../lastfm';

export default function LastFmCredentials() {
    const id = useId();
    const apiKeyRef = useRef<HTMLInputElement>(null);
    const secretRef = useRef<HTMLInputElement>(null);
    const readOnly = !!lf_api_key;

    const handleSubmit = useCallback(async () => {
        const apiKey = apiKeyRef.current!.value;
        const secret = secretRef.current!.value;
        if (apiKey !== lastfmSettings.apiKey || secret !== lastfmSettings.secret) {
            lastfmSettings.apiKey = apiKey;
            lastfmSettings.secret = secret;
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
                    defaultValue={lastfmSettings.apiKey}
                    readOnly={readOnly}
                    inputRef={apiKeyRef}
                    autoFocus
                />
                <AppCredential
                    label="Shared Secret"
                    type="password"
                    name="lastfm-secret"
                    defaultValue={lastfmSettings.secret}
                    readOnly={readOnly}
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
