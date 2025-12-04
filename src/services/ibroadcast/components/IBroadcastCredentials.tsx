import React, {useCallback, useRef} from 'react';
import {copyToClipboard} from 'utils';
import CopyButton from 'components/Button/CopyButton';
import DialogButtons from 'components/Dialog/DialogButtons';
import CredentialsInput from 'components/Settings/MediaLibrarySettings/CredentialsInput';
import CredentialsRegistration from 'components/Settings/MediaLibrarySettings/CredentialsRegistration';
import {MediaServiceCredentialsProps} from 'components/Settings/MediaLibrarySettings/MediaServiceCredentials';
import ibroadcastSettings from '../ibroadcastSettings';
import useCredentials from './useCredentials';

export default function IBroadcastCredentials({service: ibroadcast}: MediaServiceCredentialsProps) {
    const ref = useRef<HTMLFormElement>(null);
    const {clientId} = useCredentials();
    const clientIdRef = useRef<HTMLInputElement>(null);
    const redirectUri = `${location.origin}/auth/ibroadcast/callback/`;
    const locked = ibroadcast.credentialsLocked;

    const handleSubmit = useCallback(async () => {
        const clientId = clientIdRef.current!.value;
        if (clientId !== ibroadcastSettings.clientId) {
            ibroadcastSettings.clientId = clientId;
            if (ibroadcast.isLoggedIn()) {
                await ibroadcast.logout();
            }
        }
    }, [ibroadcast]);

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
                    inputRef={clientIdRef}
                    autoFocus
                />
            </fieldset>
            <fieldset className="credentials-requirements note">
                <legend>Requirements</legend>
                <p>Redirect URI:</p>
                <p className="credentials-callback">
                    <input type="text" value={redirectUri} readOnly />
                    <CopyButton onClick={() => copyToClipboard(redirectUri)} />
                </p>
            </fieldset>
            <DialogButtons />
        </form>
    );
}
