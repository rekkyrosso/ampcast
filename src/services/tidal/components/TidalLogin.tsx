import React from 'react';
import {LoginProps} from 'components/Login';
import CredentialsButton from 'components/Login/CredentialsButton';
import CredentialsRequired from 'components/Login/CredentialsRequired';
import LoginButton from 'components/Login/LoginButton';
import LoginRequired from 'components/Login/LoginRequired';
import ServiceLink from 'components/Login/ServiceLink';
import useCredentials from './useCredentials';

export default function TidalLogin({service: tidal}: LoginProps) {
    const {clientId} = useCredentials();

    return (
        <>
            {clientId ? (
                <>
                    <LoginRequired service={tidal} />
                    <LoginButton service={tidal} />
                </>
            ) : (
                <>
                    <CredentialsRequired service={tidal} />
                    <CredentialsButton service={tidal} />
                </>
            )}
            <ServiceLink service={tidal} />
        </>
    );
}
