import React, {useCallback, useId, useRef} from 'react';
import {yt_client_id} from 'services/credentials';
import AppCredentials from 'components/Settings/MediaLibrarySettings/AppCredentials';
import AppCredential from 'components/Settings/MediaLibrarySettings/AppCredential';
import ExternalLink from 'components/ExternalLink';
import Icon from 'components/Icon';
import youtubeSettings from '../youtubeSettings';
import youtube from '../youtube';

export default function YouTubeCredentials() {
    const id = useId();
    const apiKeyRef = useRef<HTMLInputElement>(null);
    const clientIdRef = useRef<HTMLInputElement>(null);
    const readOnly = !!yt_client_id;
    const url = 'https://console.cloud.google.com/apis/credentials';

    const handleSubmit = useCallback(async () => {
        const apiKey = apiKeyRef.current!.value;
        const clientId = clientIdRef.current!.value;
        if (apiKey !== youtubeSettings.apiKey || clientId !== youtubeSettings.clientId) {
            youtubeSettings.apiKey = apiKey;
            youtubeSettings.clientId = clientId;
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
                    label="Client ID"
                    name="youtube-client-id"
                    defaultValue={youtubeSettings.clientId}
                    readOnly={readOnly}
                    inputRef={clientIdRef}
                    autoFocus
                />
                <AppCredential
                    label="API Key"
                    name="youtube-api-key"
                    defaultValue={youtubeSettings.apiKey}
                    readOnly={readOnly}
                    inputRef={apiKeyRef}
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
