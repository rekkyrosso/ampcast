import React, {useCallback, useId, useRef} from 'react';
import DialogButtons from 'components/Dialog/DialogButtons';
import CredentialsInput from 'components/Settings/MediaLibrarySettings/CredentialsInput';
import CredentialsRegistration from 'components/Settings/MediaLibrarySettings/CredentialsRegistration';
import {MediaServiceCredentialsProps} from 'components/Settings/MediaLibrarySettings/MediaServiceCredentials';
import appleSettings from '../appleSettings';
import useCredentials from './useCredentials';

export default function AppleCredentials({service: apple}: MediaServiceCredentialsProps) {
    const id = useId();
    const {devToken} = useCredentials();
    const devTokenRef = useRef<HTMLInputElement>(null);

    const handleSubmit = useCallback(async () => {
        const devToken = devTokenRef.current!.value;
        if (devToken !== appleSettings.devToken) {
            appleSettings.devToken = devToken;
            if (apple.isLoggedIn()) {
                await apple.logout();
            }
        }
    }, [apple]);

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
                    inputRef={devTokenRef}
                    autoFocus
                />
            </fieldset>
            <fieldset className="credentials-requirements note">
                <legend>Requirements</legend>
                <p>Enabled Services:</p>
                <ul>
                    <li>
                        <input type="checkbox" id={`${id}-api1`} checked readOnly />
                        <label htmlFor={`${id}-api1`}>Media Services (MusicKit)</label>
                    </li>
                </ul>
            </fieldset>
            <DialogButtons />
        </form>
    );
}
