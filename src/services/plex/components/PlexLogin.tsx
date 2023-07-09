import React from 'react';
import DefaultLogin from 'components/Login/DefaultLogin';
import plex from '../plex';
import usePinRefresher from './usePinRefresher';

export default function PlexLogin() {
    usePinRefresher();
    return <DefaultLogin service={plex} />;
}
