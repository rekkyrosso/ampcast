import React, {useCallback, useId, useState} from 'react';
import {copyToClipboard} from 'utils';
import {CopyButton} from 'components/Button';
import {DialogButtons} from 'components/Dialog';
import CredentialsInput from 'components/Settings/MediaLibrarySettings/CredentialsInput';
import CredentialsRegistration from 'components/Settings/MediaLibrarySettings/CredentialsRegistration';
import {MediaServiceCredentialsProps} from 'components/Settings/MediaLibrarySettings/MediaServiceCredentials';
import youtubeSettings from '../youtubeSettings';
import useCredentials from './useCredentials';

export default function YouTubeCredentials({service: youtube}: MediaServiceCredentialsProps) {
    const id = useId();
    const credentials = useCredentials();
    const [clientId, setClientId] = useState(credentials.clientId);
    const authorizedOrigin = location.origin;

    const handleSubmit = useCallback(async () => {
        if (clientId !== youtubeSettings.clientId) {
            youtubeSettings.clientId = clientId;
            if (youtube.isLoggedIn()) {
                await youtube.logout();
            }
        }
    }, [youtube, clientId]);

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
                    onChange={setClientId}
                    autoFocus
                />
            </fieldset>
            <fieldset className="credentials-requirements note">
                <legend>Requirements</legend>
                <dl className="requirements">
                    <dt>Authorized JavaScript origin:</dt>
                    <dd className="credentials-callback">
                        <input type="text" value={authorizedOrigin} readOnly />
                        <CopyButton onClick={() => copyToClipboard(authorizedOrigin)} />
                    </dd>
                    <dt>Selected APIs:</dt>
                    <dd>
                        <ul>
                            <li>
                                <input type="checkbox" id={`${id}-api`} checked readOnly />
                                <label htmlFor={`${id}-api`}>YouTube Data API v3</label>
                            </li>
                        </ul>
                    </dd>
                </dl>
            </fieldset>
            <DialogButtons />
        </form>
    );
}
