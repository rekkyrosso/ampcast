import React from 'react';
import {LoginProps} from 'components/Login';
import DevMode from 'components/Login/DevMode';
import LoginButton from 'components/Login/LoginButton';
import ServiceLink from 'components/Login/ServiceLink';

export default function SpotifyLogin({service: spotify}: LoginProps) {
    return (
        <>
            <DevMode service={spotify} />
            <p>You need to be logged in to play music from Spotify.*</p>
            <LoginButton service={spotify} />
            <p>
                <small>*Spotify Premium required.</small>
            </p>
            <ServiceLink service={spotify} />
        </>
    );
}
