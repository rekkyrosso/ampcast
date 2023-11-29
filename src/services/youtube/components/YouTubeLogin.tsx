import React from 'react';
import {LoginProps} from 'components/Login';
import DevMode from 'components/Login/DevMode';
import LoginButton from 'components/Login/LoginButton';
import ServiceLink from 'components/Login/ServiceLink';
import useGoogleClientLibrary from './useGoogleClientLibrary';

export default function YouTubeLogin({service: youtube}: LoginProps) {
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
            {/* <AddYouTubeVideo /> */}
            <ServiceLink service={youtube} />
        </>
    );
}
