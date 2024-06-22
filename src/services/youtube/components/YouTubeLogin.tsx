import React from 'react';
import {LoginProps} from 'components/Login';
import CredentialsButton from 'components/Login/CredentialsButton';
import CredentialsRequired from 'components/Login/CredentialsRequired';
import RestrictedAccessWarning from 'components/Login/RestrictedAccessWarning';
import LoginButton from 'components/Login/LoginButton';
import ServiceLink from 'components/Login/ServiceLink';
import useGoogleClientLibrary from './useGoogleClientLibrary';
import YouTubeCredentialsDialog from './YouTubeCredentialsDialog';
import useCredentials from './useCredentials';

export default function YouTubeLogin({service: youtube}: LoginProps) {
    const {client, error} = useGoogleClientLibrary();
    const {clientId} = useCredentials();

    return (
        <>
            {clientId ? (
                <>
                    <RestrictedAccessWarning service={youtube} />
                    <LoginNotRequired />
                    <LoginButton service={youtube} disabled={!client} />
                    {error ? <p className="error">Could not load Google client library.</p> : null}
                </>
            ) : (
                <>
                    <CredentialsRequired service={youtube} />
                    <CredentialsButton dialog={YouTubeCredentialsDialog} />
                    <LoginNotRequired />
                </>
            )}
            <ServiceLink service={youtube} />
        </>
    );
}

function LoginNotRequired() {
    return (
        <p>
            You can still play YouTube videos without being logged in.
            <br />
            But you need to be logged in to search for music and access your playlists.
        </p>
    );
}
