import React, {useCallback, useId, useRef} from 'react';
import DialogButtons from 'components/Dialog/DialogButtons';
import Credentials from 'components/Settings/MediaLibrarySettings/Credentials';
import {MediaServiceCredentialsProps} from 'components/Settings/MediaLibrarySettings/MediaServiceCredentials';
import ExternalLink from 'components/ExternalLink';
import spotifySettings from '../spotifySettings';
import useCredentials from './useCredentials';

export default function SpotifyCredentials({service: spotify}: MediaServiceCredentialsProps) {
    const id = useId();
    const {clientId} = useCredentials();
    const clientIdRef = useRef<HTMLInputElement>(null);

    const handleSubmit = useCallback(async () => {
        const clientId = clientIdRef.current!.value;
        if (clientId !== spotifySettings.clientId) {
            spotifySettings.clientId = clientId;
            if (spotify.isLoggedIn()) {
                await spotify.logout();
            }
        }
    }, [spotify]);

    return (
        <form className="spotify-credentials" method="dialog" onSubmit={handleSubmit}>
            <fieldset>
                <legend>Your App</legend>
                <Credentials
                    label="Client ID"
                    name="spotify-client-id"
                    defaultValue={clientId}
                    inputRef={clientIdRef}
                    autoFocus
                />
            </fieldset>
            <fieldset className="credentials-registration">
                <legend>Registration</legend>
                <p>
                    <ExternalLink icon="spotify" href={spotify.credentialsUrl} />
                </p>
            </fieldset>
            <fieldset className="credentials-requirements note">
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
            <DialogButtons />
        </form>
    );
}
