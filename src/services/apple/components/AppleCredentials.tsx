import React, {useCallback, useId, useRef} from 'react';
import {appleCreateAppUrl} from 'services/constants';
import AppCredentials from 'components/Settings/MediaLibrarySettings/AppCredentials';
import AppCredential from 'components/Settings/MediaLibrarySettings/AppCredential';
import ExternalLink from 'components/ExternalLink';
import Icon from 'components/Icon';
import appleSettings from '../appleSettings';
import apple from '../apple';
import useCredentials from './useCredentials';

export default function AppleCredentials() {
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
    }, []);

    return (
        <AppCredentials className="apple-credentials" onSubmit={handleSubmit}>
            <fieldset>
                <legend>Your App</legend>
                <AppCredential
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
                    <ExternalLink href={appleCreateAppUrl}>
                        <Icon name="apple-logo" />
                        {appleCreateAppUrl}
                    </ExternalLink>
                </p>
            </fieldset>
            <fieldset className="apple-credentials-requirements note">
                <legend>Requirements</legend>
                <p>Enabled Services:</p>
                <ul>
                    <li>
                        <input type="checkbox" id={`${id}-api1`} checked readOnly />
                        <label htmlFor={`${id}-api1`}>Media Services (MusicKit)</label>
                    </li>
                </ul>
            </fieldset>
        </AppCredentials>
    );
}
