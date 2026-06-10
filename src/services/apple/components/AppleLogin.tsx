import React from 'react';
import {LoginProps} from 'components/Login';
import ConnectionLogging from 'components/Login/ConnectionLogging';
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
                    {error ? (
                        <>
                            <div className="error">
                                <p>Could not load Apple MusicKit library.</p>
                                {error.message ? <p>{error.message}</p> : null}
                            </div>
                            {__target__ === 'electron' && error.message?.includes('expired') ? (
                                <p>
                                    <em>
                                        Please make sure that you are using the latest version of{' '}
                                        {__app_name__}.
                                    </em>
                                </p>
                            ) : null}
                        </>
                    ) : null}
                </>
            ) : (
                <>
                    <CredentialsRequired service={apple} />
                    <CredentialsButton service={apple} />
                </>
            )}
            <ServiceLink service={apple} />
            <ConnectionLogging service={apple} />
        </>
    );
}
