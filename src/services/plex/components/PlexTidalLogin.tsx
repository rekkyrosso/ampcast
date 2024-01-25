import React from 'react';
import {LoginProps} from 'components/Login';
import ConnectionLogging from 'components/Login/ConnectionLogging';
import LoginRequired from 'components/Login/LoginRequired';
import LoginButton from 'components/Login/LoginButton';
import ServiceLink from 'components/Login/ServiceLink';
import usePinRefresher from './usePinRefresher';
import './PlexTidalLogin.scss';

export default function PlexTidalLogin({service: tidal}: LoginProps) {
    const plex = tidal.authService!;
    usePinRefresher();
    return (
        <>
            <LoginRequired service={tidal} />
            <LoginButton service={plex} />
            <ServiceLink service={plex} />
            <ServiceLink service={tidal} />
            <ConnectionLogging service={plex} />
        </>
    );
}
