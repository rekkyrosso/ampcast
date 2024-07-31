import React, {useCallback, useId, useRef} from 'react';
import DialogButtons from 'components/Dialog/DialogButtons';
import Credentials from 'components/Settings/MediaLibrarySettings/Credentials';
import {MediaServiceCredentialsProps} from 'components/Settings/MediaLibrarySettings/MediaServiceCredentials';
import ExternalLink from 'components/ExternalLink';
import Icon from 'components/Icon';
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
            <fieldset>
                <legend>Your App</legend>
                <Credentials
                    label="Developer Token"
                    name="apple-dev-token"
                    defaultValue={devToken}
                    inputRef={devTokenRef}
                    autoFocus
                />
            </fieldset>
            <fieldset>
                <legend>Registration</legend>
                <p className="apple-link service-link">
                    <ExternalLink href={apple.credentialsUrl}>
                        <Icon name="apple-logo" />
                        {apple.credentialsUrl}
                    </ExternalLink>
                </p>
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
