import React from 'react';
import {LoginProps} from 'components/Login';
import DefaultLogin from 'components/Login/DefaultLogin';
import usePinRefresher from './usePinRefresher';

export default function PlexLogin({service: plex}: LoginProps) {
    usePinRefresher();
    return <DefaultLogin service={plex} />;
}
