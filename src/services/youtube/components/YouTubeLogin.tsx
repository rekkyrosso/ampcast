import React from 'react';
import {LoginProps} from 'components/Login';
import ConnectionLogging from 'components/Login/ConnectionLogging';
import CredentialsButton from 'components/Login/CredentialsButton';
import CredentialsRequired from 'components/Login/CredentialsRequired';
import LoginButton from 'components/Login/LoginButton';
import ServiceLink from 'components/Login/ServiceLink';
import useGoogleClientLibrary from './useGoogleClientLibrary';
import useCredentials from './useCredentials';

export default function YouTubeLogin({service: youtube}: LoginProps) {
    const {client, error} = useGoogleClientLibrary();
    const {clientId} = useCredentials();

    return (
        <>
            {clientId ? (
                <>
                    <LoginNotRequired />
                    <LoginButton service={youtube} disabled={!client} />
                    {error ? <p className="error">Could not load Google client library.</p> : null}
                </>
            ) : (
                <>
                    <CredentialsRequired service={youtube} />
                    <CredentialsButton service={youtube} />
                    <LoginNotRequired />
                </>
            )}
            <ServiceLink service={youtube} />
            <ConnectionLogging service={youtube} />
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
