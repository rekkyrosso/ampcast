import React, {useCallback, useId, useRef} from 'react';
import AppCredentials from 'components/Settings/MediaLibrarySettings/AppCredentials';
import AppCredential from 'components/Settings/MediaLibrarySettings/AppCredential';
import ExternalLink from 'components/ExternalLink';
import Icon from 'components/Icon';
import youtubeSettings from '../youtubeSettings';
import youtube from '../youtube';
import useCredentials from './useCredentials';

export default function YouTubeCredentials() {
    const id = useId();
    const {clientId} = useCredentials();
    const clientIdRef = useRef<HTMLInputElement>(null);

    const handleSubmit = useCallback(async () => {
        const clientId = clientIdRef.current!.value;
        if (clientId !== youtubeSettings.clientId) {
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
                    defaultValue={clientId}
                    inputRef={clientIdRef}
                    autoFocus
                />
            </fieldset>
            <fieldset>
                <legend>Registration</legend>
                <p className="youtube-link service-link">
                    <ExternalLink href={youtube.credentialsUrl}>
                        <Icon name="google-cloud" />
                        {youtube.credentialsUrl}
                    </ExternalLink>
                </p>
            </fieldset>
            <fieldset className="app-credentials-requirements note">
                <legend>Requirements</legend>
                <p>
                    <label htmlFor={`${id}-origin`}>Authorized JavaScript origin:</label>
                    <input type="text" id={`${id}-origin`} value={location.origin} readOnly />
                </p>
            </fieldset>
        </AppCredentials>
    );
}
