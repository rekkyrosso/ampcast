import React from 'react';
import DevMode from 'components/Login/DevMode';
import LoginButton from 'components/Login/LoginButton';
import ServiceLink from 'components/Login/ServiceLink';
import youtube from '../youtube';
import AddYouTubeVideo from './AddYouTubeVideo';
import useGoogleClientLibrary from './useGoogleClientLibrary';

export default function YouTubeLogin() {
    const {client, error} = useGoogleClientLibrary();

    return (
        <>
            <DevMode service={youtube} />
            <p>
                You can still play YouTube videos without being logged in.
                <br />
                But you need to be logged in to search for music and access your playlists.
            </p>
            <LoginButton service={youtube} disabled={!client} />
            {error ? <p className="error">Could not load Google client library.</p> : null}
            <AddYouTubeVideo />
            <ServiceLink service={youtube} />
        </>
    );
}
