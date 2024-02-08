import React, {useCallback, useId, useRef} from 'react';
import {yt_client_id} from 'services/credentials';
import DialogButtons from 'components/Dialog/DialogButtons';
import ExternalLink from 'components/ExternalLink';
import Icon from 'components/Icon';
import youtubeSettings from '../youtubeSettings';
import './YouTubeCredentials.scss';

export default function YouTubeCredentials() {
    const id = useId();
    const apiKeyRef = useRef<HTMLInputElement>(null);
    const clientIdRef = useRef<HTMLInputElement>(null);
    const readOnly = !!yt_client_id;
    const url = 'https://console.cloud.google.com/apis/credentials';

    const handleSubmit = useCallback(async () => {
        youtubeSettings.apiKey = apiKeyRef.current!.value;
        youtubeSettings.clientId = clientIdRef.current!.value;
    }, []);

    return (
        <form className="youtube-credentials" method="dialog" onSubmit={handleSubmit}>
            <fieldset>
                <legend>Your App</legend>
                <p>
                    <label htmlFor={`${id}-api-key`}>API Key:</label>
                    <input
                        type="text"
                        name="youtube-api-key"
                        id={`${id}-api-key`}
                        defaultValue={youtubeSettings.apiKey}
                        readOnly={readOnly}
                        ref={apiKeyRef}
                    />
                </p>
                <p>
                    <label htmlFor={`${id}-client-id`}>Client ID:</label>
                    <input
                        type="text"
                        name="youtube-client-id"
                        id={`${id}-client-id`}
                        defaultValue={youtubeSettings.clientId}
                        readOnly={readOnly}
                        ref={clientIdRef}
                    />
                </p>
            </fieldset>
            <fieldset>
                <legend>Registration</legend>
                <p className="youtube-link service-link">
                    <ExternalLink href={url}>
                        <Icon name="youtube" />
                        {url}
                    </ExternalLink>
                </p>
            </fieldset>
            <fieldset className="youtube-credentials-requirements note">
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
            <DialogButtons />
        </form>
    );
}
