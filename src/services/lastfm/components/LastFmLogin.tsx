import React from 'react';
import {LoginProps} from 'components/Login';
import ConnectionLogging from 'components/Login/ConnectionLogging';
import CredentialsButton from 'components/Login/CredentialsButton';
import CredentialsRequired from 'components/Login/CredentialsRequired';
import LoginButton from 'components/Login/LoginButton';
import LoginRequired from 'components/Login/LoginRequired';
import ServiceLink from 'components/Login/ServiceLink';
import lastfmSettings from '../lastfmSettings';
import useCredentials from './useCredentials';

export default function LastFmLogin({service: lastfm}: LoginProps) {
    const {apiKey, secret} = useCredentials();

    return (
        <>
            {apiKey && (lastfmSettings.credentialsLocked || secret) ? (
                <>
                    <LoginRequired service={lastfm} />
                    <LoginButton service={lastfm} />
                </>
            ) : (
                <>
                    <CredentialsRequired service={lastfm} />
                    <CredentialsButton service={lastfm} />
                </>
            )}
            <ServiceLink service={lastfm} />
            <ConnectionLogging service={lastfm} />
        </>
    );
}
