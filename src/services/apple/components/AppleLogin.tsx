import React from 'react';
import {LoginProps} from 'components/Login';
import LoginButton from 'components/Login/LoginButton';
import LoginRequired from 'components/Login/LoginRequired';
import ServiceLink from 'components/Login/ServiceLink';
import useMusicKit from './useMusicKit';

export default function AppleLogin({service: apple}: LoginProps) {
    const {musicKit, error} = useMusicKit();

    return (
        <>
            <LoginRequired service={apple} />
            <LoginButton service={apple} disabled={!musicKit} />
            {error ? <p className="error">Could not load Apple MusicKit library.</p> : null}
            <ServiceLink service={apple} />
        </>
    );
}
