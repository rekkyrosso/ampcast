import React, {useCallback, useId, useRef} from 'react';
import {copyToClipboard} from 'utils';
import CopyButton from 'components/Button/CopyButton';
import DialogButtons from 'components/Dialog/DialogButtons';
import CredentialsInput from 'components/Settings/MediaLibrarySettings/CredentialsInput';
import CredentialsRegistration from 'components/Settings/MediaLibrarySettings/CredentialsRegistration';
import {MediaServiceCredentialsProps} from 'components/Settings/MediaLibrarySettings/MediaServiceCredentials';
import youtubeSettings from '../youtubeSettings';
import useCredentials from './useCredentials';

export default function YouTubeCredentials({service: youtube}: MediaServiceCredentialsProps) {
    const id = useId();
    const {clientId} = useCredentials();
    const clientIdRef = useRef<HTMLInputElement>(null);
    const authorizedOrigin = location.origin;

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
            <CredentialsRegistration service={youtube} icon="google-cloud" />
            <fieldset>
                <legend>Your App</legend>
                <CredentialsInput
                    locked={youtube.credentialsLocked}
                    label="OAuth Client ID"
                    name="youtube-client-id"
                    defaultValue={clientId}
                    inputRef={clientIdRef}
                    autoFocus
                />
            </fieldset>
            <fieldset className="credentials-requirements note">
                <legend>Requirements</legend>
                <p>Authorized JavaScript origin:</p>
                <p className="credentials-callback">
                    <input type="text" value={authorizedOrigin} readOnly />
                    <CopyButton onClick={() => copyToClipboard(authorizedOrigin)} />
                </p>
                <p>Selected APIs:</p>
                <ul>
                    <li>
                        <input type="checkbox" id={`${id}-api`} checked readOnly />
                        <label htmlFor={`${id}-api`}>YouTube Data API v3</label>
                    </li>
                </ul>
            </fieldset>
            <DialogButtons />
        </form>
    );
}
