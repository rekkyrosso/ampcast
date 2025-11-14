import React from 'react';
import {LoginProps} from 'components/Login';
import CredentialsButton from 'components/Login/CredentialsButton';
import CredentialsRequired from 'components/Login/CredentialsRequired';
import LoginButton from 'components/Login/LoginButton';
import ServiceLink from 'components/Login/ServiceLink';
import useCredentials from './useCredentials';

export default function SpotifyLogin({service: spotify}: LoginProps) {
    const {clientId} = useCredentials();

    return window.isSecureContext ? (
        <>
            {clientId ? (
                <>
                    <p>You need to be logged in to play music from Spotify.*</p>
                    <LoginButton service={spotify} />
                    <p>
                        <small>*Spotify Premium required.</small>
                    </p>
                </>
            ) : (
                <>
                    <CredentialsRequired service={spotify} />
                    <CredentialsButton service={spotify} />
                </>
            )}
            <ServiceLink service={spotify} />
        </>
    ) : (
        <>
            <SecureContextRequired />
            <ServiceLink service={spotify} />
        </>
    );
}

function SecureContextRequired() {
    return (
        <div className="note">
            <p>
                A <em>secure context</em> is required for Spotify login.
            </p>
            <p>
                Your {__app_name__} application needs to be hosted on a <code>localhost</code> or{' '}
                <code>https:</code> domain.
            </p>
        </div>
    );
}
