import React from 'react';
import {LoginProps} from 'components/Login';
import CredentialsButton from 'components/Login/CredentialsButton';
import CredentialsRequired from 'components/Login/CredentialsRequired';
import RestrictedAccessWarning from 'components/Login/RestrictedAccessWarning';
import LoginButton from 'components/Login/LoginButton';
import ServiceLink from 'components/Login/ServiceLink';
import useCredentials from './useCredentials';

export default function SpotifyLogin({service: spotify}: LoginProps) {
    const {clientId} = useCredentials();

    return (
        <>
            {clientId ? (
                <>
                    <RestrictedAccessWarning service={spotify} />
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
    );
}
