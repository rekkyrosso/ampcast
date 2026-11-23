import React, {useCallback, useRef, useState} from 'react';
import {copyToClipboard} from 'utils';
import {CopyButton} from 'components/Button';
import {DialogButtons} from 'components/Dialog';
import CredentialsInput from 'components/Settings/MediaLibrarySettings/CredentialsInput';
import CredentialsRegistration from 'components/Settings/MediaLibrarySettings/CredentialsRegistration';
import {MediaServiceCredentialsProps} from 'components/Settings/MediaLibrarySettings/MediaServiceCredentials';
import ibroadcastSettings from '../ibroadcastSettings';
import useCredentials from './useCredentials';

export default function IBroadcastCredentials({service: ibroadcast}: MediaServiceCredentialsProps) {
    const ref = useRef<HTMLFormElement>(null);
    const credentials = useCredentials();
    const [clientId, setClientId] = useState(credentials.clientId);
    const redirectUri = ibroadcastSettings.redirectUri;
    const locked = ibroadcast.credentialsLocked;

    const handleSubmit = useCallback(async () => {
        if (clientId !== ibroadcastSettings.clientId) {
            ibroadcastSettings.clientId = clientId;
            if (ibroadcast.isLoggedIn()) {
                await ibroadcast.logout();
            }
        }
    }, [ibroadcast, clientId]);

    return (
        <form className="ibroadcast-credentials" method="dialog" onSubmit={handleSubmit} ref={ref}>
            <CredentialsRegistration service={ibroadcast} />
            <fieldset>
                <legend>Your App</legend>
                <CredentialsInput
                    locked={locked}
                    label="Client ID"
                    name="ibroadcast-client-id"
                    defaultValue={clientId}
                    onChange={setClientId}
                    autoFocus
                />
            </fieldset>
            <fieldset className="credentials-requirements note">
                <legend>Requirements</legend>
                <div className="requirement">
                    <p>Redirect URI:</p>
                    <p className="credentials-callback">
                        <input type="text" value={redirectUri} readOnly />
                        <CopyButton onClick={() => copyToClipboard(redirectUri)} />
                    </p>
                </div>
            </fieldset>
            <DialogButtons />
        </form>
    );
}
