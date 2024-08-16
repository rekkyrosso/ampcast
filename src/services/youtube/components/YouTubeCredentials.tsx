import React, {useCallback, useId, useRef} from 'react';
import DialogButtons from 'components/Dialog/DialogButtons';
import Credentials from 'components/Settings/MediaLibrarySettings/Credentials';
import {MediaServiceCredentialsProps} from 'components/Settings/MediaLibrarySettings/MediaServiceCredentials';
import ExternalLink from 'components/ExternalLink';
import youtubeSettings from '../youtubeSettings';
import useCredentials from './useCredentials';

export default function YouTubeCredentials({service: youtube}: MediaServiceCredentialsProps) {
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
    }, [youtube]);

    return (
        <form className="youtube-credentials" method="dialog" onSubmit={handleSubmit}>
            <fieldset>
                <legend>Your App</legend>
                <Credentials
                    label="Client ID"
                    name="youtube-client-id"
                    defaultValue={clientId}
                    inputRef={clientIdRef}
                    autoFocus
                />
            </fieldset>
            <fieldset className="credentials-registration">
                <legend>Registration</legend>
                <p>
                    <ExternalLink icon="google-cloud" href={youtube.credentialsUrl} />
                </p>
            </fieldset>
            <fieldset className="credentials-requirements note">
                <legend>Requirements</legend>
                <p>
                    <label htmlFor={`${id}-origin`}>Authorized JavaScript origin:</label>
                    <input type="text" id={`${id}-origin`} value={location.origin} readOnly />
                </p>
            </fieldset>
            <DialogButtons />
        </form>
    );
}
