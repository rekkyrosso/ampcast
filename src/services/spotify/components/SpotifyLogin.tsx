import React from 'react';
import DevMode from 'components/Login/DevMode';
import LoginButton from 'components/Login/LoginButton';
import ServiceLink from 'components/Login/ServiceLink';
import spotify from '../spotify';

export default function SpotifyLogin() {
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
