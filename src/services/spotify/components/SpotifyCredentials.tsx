import React, {useCallback, useId, useRef} from 'react';
import {spotifyCreateAppUrl} from 'services/constants';
import {sp_client_id} from 'services/credentials';
import AppCredentials from 'components/Settings/MediaLibrarySettings/AppCredentials';
import AppCredential from 'components/Settings/MediaLibrarySettings/AppCredential';
import ExternalLink from 'components/ExternalLink';
import Icon from 'components/Icon';
import spotifySettings from '../spotifySettings';
import spotify from '../spotify';

export default function SpotifyCredentials() {
    const id = useId();
    const clientIdRef = useRef<HTMLInputElement>(null);
    const readOnly = !!sp_client_id;

    const handleSubmit = useCallback(async () => {
        const clientId = clientIdRef.current!.value;
        if (clientId !== spotifySettings.clientId) {
            spotifySettings.clientId = clientId;
            if (spotify.isLoggedIn()) {
                await spotify.logout();
            }
        }
    }, []);

    return (
        <AppCredentials className="spotify-credentials" onSubmit={handleSubmit}>
            <fieldset>
                <legend>Your App</legend>
                <AppCredential
                    label="Client ID"
                    name="spotify-client-id"
                    defaultValue={spotifySettings.clientId}
                    readOnly={readOnly}
                    inputRef={clientIdRef}
                    autoFocus
                />
            </fieldset>
            <fieldset>
                <legend>Registration</legend>
                <p className="spotify-link service-link">
                    <ExternalLink href={spotifyCreateAppUrl}>
                        <Icon name="spotify" />
                        {spotifyCreateAppUrl}
                    </ExternalLink>
                </p>
            </fieldset>
            <fieldset className="spotify-credentials-requirements note">
                <legend>Requirements</legend>
                <p>
                    <label htmlFor={`${id}-callback`}>Redirect URI:</label>
                    <input
                        type="text"
                        id={`${id}-callback`}
                        value={`${location.origin}/auth/spotify/callback/`}
                        readOnly
                    />
                </p>
                <p>APIs used:</p>
                <ul>
                    <li>
                        <input type="checkbox" id={`${id}-api1`} checked readOnly />
                        <label htmlFor={`${id}-api1`}>Web API</label>
                    </li>
                    <li>
                        <input type="checkbox" id={`${id}-api2`} checked readOnly />
                        <label htmlFor={`${id}-api2`}>Web Playback SDK</label>
                    </li>
                </ul>
            </fieldset>
        </AppCredentials>
    );
}
