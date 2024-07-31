import React from 'react';
import {LoginProps} from 'components/Login';
import CredentialsButton from 'components/Login/CredentialsButton';
import CredentialsRequired from 'components/Login/CredentialsRequired';
import LoginButton from 'components/Login/LoginButton';
import LoginRequired from 'components/Login/LoginRequired';
import ServiceLink from 'components/Login/ServiceLink';
import useCredentials from './useCredentials';
import useMusicKit from './useMusicKit';

export default function AppleLogin({service: apple}: LoginProps) {
    const {devToken} = useCredentials();
    const {musicKit, error} = useMusicKit(devToken);

    return (
        <>
            {devToken ? (
                <>
                    <LoginRequired service={apple} />
                    <LoginButton service={apple} disabled={!musicKit} />
                    {error ? <p className="error">Could not load Apple MusicKit library.</p> : null}
                </>
            ) : (
                <>
                    <CredentialsRequired service={apple} />
                    <CredentialsButton service={apple} />
                </>
            )}
            <ServiceLink service={apple} />
        </>
    );
}
