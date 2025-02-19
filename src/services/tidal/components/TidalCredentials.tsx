import React, {useCallback, useId, useRef} from 'react';
import {copyToClipboard} from 'utils';
import CopyButton from 'components/Button/CopyButton';
import DialogButtons from 'components/Dialog/DialogButtons';
import CredentialsInput from 'components/Settings/MediaLibrarySettings/CredentialsInput';
import CredentialsRegistration from 'components/Settings/MediaLibrarySettings/CredentialsRegistration';
import {MediaServiceCredentialsProps} from 'components/Settings/MediaLibrarySettings/MediaServiceCredentials';
import tidalSettings from '../tidalSettings';
import useCredentials from './useCredentials';

export default function TidalCredentials({service: tidal}: MediaServiceCredentialsProps) {
    const id = useId();
    const {clientId} = useCredentials();
    const clientIdRef = useRef<HTMLInputElement>(null);
    const redirectUrl = `${location.origin}/auth/tidal/callback/`;

    const handleSubmit = useCallback(async () => {
        const clientId = clientIdRef.current!.value;
        if (clientId !== tidalSettings.clientId) {
            tidalSettings.clientId = clientId;
            if (tidal.isLoggedIn()) {
                await tidal.logout();
            }
        }
    }, [tidal]);

    return (
        <form className="tidal-credentials" method="dialog" onSubmit={handleSubmit}>
            <CredentialsRegistration service={tidal} />
            <fieldset>
                <legend>Your App</legend>
                <CredentialsInput
                    locked={tidal.credentialsLocked}
                    label="Client ID"
                    name="tidal-client-id"
                    defaultValue={clientId}
                    inputRef={clientIdRef}
                    autoFocus
                />
            </fieldset>
            <fieldset className="credentials-requirements note">
                <legend>Requirements</legend>
                <p>Redirect URL:</p>
                <p className="credentials-callback">
                    <input type="text" value={redirectUrl} readOnly />
                    <CopyButton onClick={() => copyToClipboard(redirectUrl)} />
                </p>
                <p>Platform preset: WEB</p>
                <p>Scopes:</p>
                <ul>
                    <li>
                        <input type="checkbox" id={`${id}-api1`} checked readOnly />
                        <label htmlFor={`${id}-api1`}>
                            <i>select all scopes</i>
                        </label>
                    </li>
                </ul>
            </fieldset>
            <DialogButtons />
        </form>
    );
}
