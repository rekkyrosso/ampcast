import React from 'react';
import youtube from 'services/youtube';
import DevMode from './DevMode';
import LoginButton from './LoginButton';
import ServiceLink from './ServiceLink';

export default function YouTubeLogin() {
    return (
        <div className="panel">
            <div className="page login">
                <DevMode service={youtube} />
                <p>
                    You can still play YouTube videos without being logged in.
                    <br />
                    But you need to be logged in to search for music and access your playlists.
                </p>
                <LoginButton service={youtube} />
                <ServiceLink service={youtube} />
            </div>
        </div>
    );
}
