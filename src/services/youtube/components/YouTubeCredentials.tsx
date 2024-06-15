import React, {useCallback, useId, useRef} from 'react';
import {error} from 'components/Dialog';
import AppCredentials from 'components/Settings/MediaLibrarySettings/AppCredentials';
import AppCredential from 'components/Settings/MediaLibrarySettings/AppCredential';
import ExternalLink from 'components/ExternalLink';
import Icon from 'components/Icon';
import youtubeSettings from '../youtubeSettings';
import youtube from '../youtube';
import useCredentials from './useCredentials';

export default function YouTubeCredentials() {
    const id = useId();
    const {apiKey, clientId} = useCredentials();
    const apiKeyRef = useRef<HTMLInputElement>(null);
    const clientIdRef = useRef<HTMLInputElement>(null);
    const url = 'https://console.cloud.google.com/apis/credentials';

    const handleSubmit = useCallback(async () => {
        const apiKey = apiKeyRef.current!.value;
        const clientId = clientIdRef.current!.value;
        const currentApiKey = await youtubeSettings.getApiKey();
        if (apiKey !== currentApiKey || clientId !== youtubeSettings.clientId) {
            youtubeSettings.clientId = clientId;
            if (apiKey !== currentApiKey) {
                try {
                    await youtubeSettings.setApiKey(apiKey);
                } catch (err: any) {
                    console.error(err);
                    await error('Failed to store API key.');
                }
            }
            if (youtube.isLoggedIn()) {
                await youtube.logout();
            }
        }
    }, []);

    return (
        <AppCredentials className="youtube-credentials" onSubmit={handleSubmit}>
            <fieldset>
                <legend>Your App</legend>
                <AppCredential
                    label="API Key"
                    name="youtube-api-key"
                    defaultValue={apiKey}
                    inputRef={apiKeyRef}
                    autoFocus
                />
                <AppCredential
                    label="Client ID"
                    name="youtube-client-id"
                    defaultValue={clientId}
                    inputRef={clientIdRef}
                />
            </fieldset>
            <fieldset>
                <legend>Registration</legend>
                <p className="youtube-link service-link">
                    <ExternalLink href={url}>
                        <Icon name="google-cloud" />
                        {url}
                    </ExternalLink>
                </p>
            </fieldset>
            <fieldset className="app-credentials-requirements note">
                <legend>Requirements</legend>
                <p>
                    <label htmlFor={`${id}-origin`}>Authorized JavaScript origin:</label>
                    <input type="text" id={`${id}-origin`} value={location.origin} readOnly />
                </p>
                <p>Selected APIs:</p>
                <ul>
                    <li>
                        <input type="checkbox" id={`${id}-api1`} checked readOnly />
                        <label htmlFor={`${id}-api1`}>YouTube Data API v3</label>
                    </li>
                </ul>
            </fieldset>
        </AppCredentials>
    );
}
