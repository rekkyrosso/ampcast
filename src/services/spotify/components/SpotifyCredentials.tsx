import React, {useCallback, useId, useRef} from 'react';
import {copyToClipboard} from 'utils';
import CopyButton from 'components/Button/CopyButton';
import DialogButtons from 'components/Dialog/DialogButtons';
import CredentialsInput from 'components/Settings/MediaLibrarySettings/CredentialsInput';
import CredentialsRegistration from 'components/Settings/MediaLibrarySettings/CredentialsRegistration';
import {MediaServiceCredentialsProps} from 'components/Settings/MediaLibrarySettings/MediaServiceCredentials';
import spotifySettings from '../spotifySettings';
import useCredentials from './useCredentials';

export default function SpotifyCredentials({service: spotify}: MediaServiceCredentialsProps) {
    const id = useId();
    const ref = useRef<HTMLFormElement>(null);
    const {clientId} = useCredentials();
    const clientIdRef = useRef<HTMLInputElement>(null);
    const redirectUri = spotifySettings.redirectUri;
    const locked = spotify.credentialsLocked;

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
        <form className="spotify-credentials" method="dialog" onSubmit={handleSubmit} ref={ref}>
            <CredentialsRegistration service={spotify} />
            <fieldset>
                <legend>Your App</legend>
                <CredentialsInput
                    locked={locked}
                    label="Client ID"
                    name="spotify-client-id"
                    defaultValue={clientId}
                    inputRef={clientIdRef}
                    autoFocus
                />
            </fieldset>
            <fieldset className="credentials-requirements note">
                <legend>Requirements</legend>
                <p>Redirect URIs:</p>
                <p className="credentials-callback">
                    <input type="text" value={redirectUri} readOnly />
                    <CopyButton onClick={() => copyToClipboard(redirectUri)} />
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
