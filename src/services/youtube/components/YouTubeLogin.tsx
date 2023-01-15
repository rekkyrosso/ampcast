import React from 'react';
import DevMode from 'components/Login/DevMode';
import LoginButton from 'components/Login/LoginButton';
import ServiceLink from 'components/Login/ServiceLink';
import youtube from '../youtube';
import AddYouTubeVideo from './AddYouTubeVideo';

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
                <AddYouTubeVideo />
                <ServiceLink service={youtube} />
            </div>
        </div>
    );
}
