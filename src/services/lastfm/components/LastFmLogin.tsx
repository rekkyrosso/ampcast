import React from 'react';
import {lastfmCreateAppUrl} from 'services/constants';
import {LoginProps} from 'components/Login';
import CredentialsButton from 'components/Login/CredentialsButton';
import CredentialsRequired from 'components/Login/CredentialsRequired';
import LoginButton from 'components/Login/LoginButton';
import LoginRequired from 'components/Login/LoginRequired';
import ServiceLink from 'components/Login/ServiceLink';
import LastFmCredentialsDialog from './LastFmCredentialsDialog';
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
                    <CredentialsRequired service={lastfm} url={lastfmCreateAppUrl} />
                    <CredentialsButton dialog={LastFmCredentialsDialog} />
                </>
            )}
            <ServiceLink service={lastfm} />
        </>
    );
}
