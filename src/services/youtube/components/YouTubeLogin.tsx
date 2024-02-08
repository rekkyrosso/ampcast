import React, {useCallback} from 'react';
import {yt_client_id} from 'services/credentials';
import {showDialog} from 'components/Dialog';
import {LoginProps} from 'components/Login';
import CredentialsRequired from 'components/Login/CredentialsRequired';
import DevMode from 'components/Login/DevMode';
import LoginButton from 'components/Login/LoginButton';
import ServiceLink from 'components/Login/ServiceLink';
import useGoogleClientLibrary from './useGoogleClientLibrary';
import YouTubeCredentialsDialog from './YouTubeCredentialsDialog';
import youtubeSettings from '../youtubeSettings';

export default function YouTubeLogin({service: youtube}: LoginProps) {
    const {client, error} = useGoogleClientLibrary();
    const hasCredentials = youtubeSettings.apiKey && youtubeSettings.clientId;

    const login = useCallback(async () => {
        if (!youtubeSettings.apiKey || !youtubeSettings.clientId) {
            await showDialog(YouTubeCredentialsDialog);
        }
        if (youtubeSettings.apiKey && youtubeSettings.clientId) {
            await youtube.login();
        }
    }, [youtube]);

    return (
        <>
            {hasCredentials ? (
                yt_client_id ? (
                    <DevMode service={youtube} />
                ) : null
            ) : (
                <CredentialsRequired
                    service={youtube}
                    url="https://developers.google.com/youtube/registering_an_application"
                />
            )}
            <p>
                You can still play YouTube videos without being logged in.
                <br />
                But you need to be logged in to search for music and access your playlists.
            </p>
            <LoginButton service={youtube} disabled={!client} onClick={login} />
            {error ? <p className="error">Could not load Google client library.</p> : null}
            {/* <AddYouTubeVideo /> */}
            <ServiceLink service={youtube} />
        </>
    );
}
