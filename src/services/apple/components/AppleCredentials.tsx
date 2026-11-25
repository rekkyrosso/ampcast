import React, {useCallback, useId, useState} from 'react';
import DialogButtons from 'components/Dialog/DialogButtons';
import CredentialsInput from 'components/Settings/MediaLibrarySettings/CredentialsInput';
import CredentialsRegistration from 'components/Settings/MediaLibrarySettings/CredentialsRegistration';
import {MediaServiceCredentialsProps} from 'components/Settings/MediaLibrarySettings/MediaServiceCredentials';
import appleSettings from '../appleSettings';
import useCredentials from './useCredentials';

export default function AppleCredentials({service: apple}: MediaServiceCredentialsProps) {
    const id = useId();
    const credentials = useCredentials();
    const [devToken, setDevToken] = useState(credentials.devToken);

    const handleSubmit = useCallback(async () => {
        if (devToken !== appleSettings.devToken) {
            appleSettings.devToken = devToken;
            if (apple.isLoggedIn()) {
                await apple.logout();
            }
        }
    }, [apple, devToken]);

    return (
        <form className="apple-credentials" method="dialog" onSubmit={handleSubmit}>
            <CredentialsRegistration service={apple} icon="apple-logo" />
            <fieldset>
                <legend>Your App</legend>
                <CredentialsInput
                    locked={apple.credentialsLocked}
                    label="Developer Token"
                    name="apple-dev-token"
                    defaultValue={devToken}
                    onChange={setDevToken}
                    autoFocus
                    secret
                />
            </fieldset>
            <fieldset className="credentials-requirements note">
                <legend>Requirements</legend>
                <dl className="requirements">
                    <dt>Enabled Services:</dt>
                    <dd>
                        <ul>
                            <li>
                                <input type="checkbox" id={`${id}-api1`} checked readOnly />
                                <label htmlFor={`${id}-api1`}>Media Services (MusicKit)</label>
                            </li>
                        </ul>
                    </dd>
                </dl>
            </fieldset>
            <DialogButtons />
        </form>
    );
}
