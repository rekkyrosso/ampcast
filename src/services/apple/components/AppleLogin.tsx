import React, {useCallback, useState} from 'react';
import {appleCreateAppUrl} from 'services/constants';
import {LoginProps} from 'components/Login';
import CredentialsRequired from 'components/Login/CredentialsRequired';
import LoginButton from 'components/Login/LoginButton';
import LoginRequired from 'components/Login/LoginRequired';
import ServiceLink from 'components/Login/ServiceLink';
import {showDialog} from 'components/Dialog';
import appleSettings from '../appleSettings';
import AppleCredentialsDialog from './AppleCredentialsDialog';
import useMusicKit from './useMusicKit';

export default function AppleLogin({service: apple}: LoginProps) {
    const [devToken, setDevToken] = useState(() => appleSettings.devToken);
    const {musicKit, error} = useMusicKit(devToken);

    const login = useCallback(async () => {
        if (devToken) {
            await apple.login();
        } else {
            await showDialog(AppleCredentialsDialog, true);
            setDevToken(appleSettings.devToken);
        }
    }, [apple, devToken]);

    return (
        <>
            {appleSettings.devToken ? null : (
                <CredentialsRequired service={apple} url={appleCreateAppUrl} />
            )}
            <LoginRequired service={apple} />
            <LoginButton service={apple} disabled={!!devToken && !musicKit} onClick={login} />
            {error ? <p className="error">Could not load Apple MusicKit library.</p> : null}
            <ServiceLink service={apple} />
        </>
    );
}
