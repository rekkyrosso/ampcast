import React from 'react';
import {LoginProps} from 'components/Login';
import CredentialsButton from 'components/Login/CredentialsButton';
import CredentialsRequired from 'components/Login/CredentialsRequired';
import LoginButton from 'components/Login/LoginButton';
import LoginRequired from 'components/Login/LoginRequired';
import ServiceLink from 'components/Login/ServiceLink';
import useCredentials from './useCredentials';

export default function LastFmLogin({service: lastfm}: LoginProps) {
    const {apiKey, secret} = useCredentials();

    return (
        <>
            {apiKey && secret ? (
                <>
                    <LoginRequired service={lastfm} />
                    <LoginButton service={lastfm} />
                </>
            ) : (
                <>
                    <CredentialsRequired service={lastfm} />
                    <p>
                        <CredentialsButton service={lastfm} />
                    </p>
                </>
            )}
            <ServiceLink service={lastfm} />
        </>
    );
}
