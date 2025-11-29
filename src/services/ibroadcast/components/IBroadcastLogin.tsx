import React from 'react';
import {LoginProps} from 'components/Login';
import CredentialsButton from 'components/Login/CredentialsButton';
import CredentialsRequired from 'components/Login/CredentialsRequired';
import LoginButton from 'components/Login/LoginButton';
import LoginRequired from 'components/Login/LoginRequired';
import SecureContextRequired from 'components/Login/SecureContextRequired';
import ServiceLink from 'components/Login/ServiceLink';
import useCredentials from './useCredentials';

export default function IBroadcastLogin({service: ibroadcast}: LoginProps) {
    const {clientId} = useCredentials();

    return window.isSecureContext ? (
        <>
            {clientId ? (
                <>
                    <LoginRequired service={ibroadcast} />
                    <LoginButton service={ibroadcast} />
                </>
            ) : (
                <>
                    <CredentialsRequired service={ibroadcast} />
                    <CredentialsButton service={ibroadcast} />
                </>
            )}
            <ServiceLink service={ibroadcast} />
        </>
    ) : (
        <>
            <SecureContextRequired service={ibroadcast} />
            <ServiceLink service={ibroadcast} />
        </>
    );
}
