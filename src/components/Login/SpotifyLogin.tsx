import React from 'react';
import spotify from 'services/spotify';
import DevMode from './DevMode';
import LoginButton from './LoginButton';
import ServiceLink from './ServiceLink';

export default function SpotifyLogin() {
    return (
        <div className="panel">
            <div className="page login">
                <DevMode service={spotify} />
                <p>You need to be logged in to play music from Spotify.*</p>
                <LoginButton service={spotify} />
                <ServiceLink service={spotify} />
                <p>
                    <small>*Spotify Premium required.</small>
                </p>
            </div>
        </div>
    );
}
