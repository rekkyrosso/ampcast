import React, {useCallback, useId, useRef, useState} from 'react';
import {copyToClipboard} from 'utils';
import {CopyButton} from 'components/Button';
import {DialogButtons} from 'components/Dialog';
import CredentialsInput from 'components/Settings/MediaLibrarySettings/CredentialsInput';
import CredentialsRegistration from 'components/Settings/MediaLibrarySettings/CredentialsRegistration';
import {MediaServiceCredentialsProps} from 'components/Settings/MediaLibrarySettings/MediaServiceCredentials';
import spotifySettings from '../spotifySettings';
import useCredentials from './useCredentials';

export default function SpotifyCredentials({service: spotify}: MediaServiceCredentialsProps) {
    const id = useId();
    const ref = useRef<HTMLFormElement>(null);
    const credentials = useCredentials();
    const [clientId, setClientId] = useState(credentials.clientId);
    const redirectUri = spotifySettings.redirectUri;
    const locked = spotify.credentialsLocked;

    const handleSubmit = useCallback(async () => {
        if (clientId !== spotifySettings.clientId) {
            spotifySettings.clientId = clientId;
            if (spotify.isLoggedIn()) {
                await spotify.logout();
            }
        }
    }, [spotify, clientId]);

    return (
        <form className="spotify-credentials" method="dialog" onSubmit={handleSubmit} ref={ref}>
            <CredentialsRegistration service={spotify} />
            <fieldset>
                <legend>Your App</legend>
                <CredentialsInput
                    locked={locked}
                    label="Client ID"
                    name="spotify-client-id"
                    defaultValue={clientId}
                    onChange={setClientId}
                    autoFocus
                />
            </fieldset>
            <fieldset className="credentials-requirements note">
                <legend>Requirements</legend>
                <dl className="requirements">
                    <dt>Redirect URIs:</dt>
                    <dd className="credentials-callback">
                        <input type="text" value={redirectUri} readOnly />
                        <CopyButton onClick={() => copyToClipboard(redirectUri)} />
                    </dd>
                    <dt>APIs used:</dt>
                    <dd>
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
                    </dd>
                </dl>
            </fieldset>
            <DialogButtons />
        </form>
    );
}
