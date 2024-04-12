import React, {useCallback} from 'react';
import {lastfmCreateAppUrl} from 'services/constants';
import {showDialog} from 'components/Dialog';
import {LoginProps} from 'components/Login';
import CredentialsRequired from 'components/Login/CredentialsRequired';
import LoginButton from 'components/Login/LoginButton';
import LoginRequired from 'components/Login/LoginRequired';
import ServiceLink from 'components/Login/ServiceLink';
import LastFmCredentialsDialog from './LastFmCredentialsDialog';
import lastfmSettings from '../lastfmSettings';

export default function LastFmLogin({service: lastfm}: LoginProps) {
    const hasCredentials = lastfmSettings.apiKey && lastfmSettings.secret;

    const login = useCallback(async () => {
        if (!lastfmSettings.apiKey || !lastfmSettings.secret) {
            await showDialog(LastFmCredentialsDialog, true);
        }
        if (lastfmSettings.apiKey && lastfmSettings.secret) {
            await lastfm.login();
        }
    }, [lastfm]);

    return (
        <>
            {hasCredentials ? (
                <LoginRequired service={lastfm} />
            ) : (
                <CredentialsRequired service={lastfm} url={lastfmCreateAppUrl} />
            )}
            <LoginButton service={lastfm} onClick={login} />
            <ServiceLink service={lastfm} />
        </>
    );
}
