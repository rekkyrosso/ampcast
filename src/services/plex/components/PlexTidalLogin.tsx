import React from 'react';
import LoginRequired from 'components/Login/LoginRequired';
import LoginButton from 'components/Login/LoginButton';
import ServiceLink from 'components/Login/ServiceLink';
import plex from '../plex';
import tidal from '../tidal';
import usePinRefresher from './usePinRefresher';
import './PlexTidalLogin.scss';

export default function PlexTidalLogin() {
    usePinRefresher();
    return (
        <>
            <LoginRequired service={tidal} />
            <LoginButton service={plex} />
            <ServiceLink service={plex} />
            <ServiceLink service={tidal} />
        </>
    );
}
