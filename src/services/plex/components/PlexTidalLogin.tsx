import React from 'react';
import {LoginProps} from 'components/Login';
import LoginRequired from 'components/Login/LoginRequired';
import LoginButton from 'components/Login/LoginButton';
import ServiceLink from 'components/Login/ServiceLink';
import usePinRefresher from './usePinRefresher';
import './PlexTidalLogin.scss';

export default function PlexTidalLogin({service: tidal}: LoginProps) {
    usePinRefresher();
    return (
        <>
            <LoginRequired service={tidal} />
            <LoginButton service={tidal.authService!} />
            <ServiceLink service={tidal.authService!} />
            <ServiceLink service={tidal} />
        </>
    );
}
