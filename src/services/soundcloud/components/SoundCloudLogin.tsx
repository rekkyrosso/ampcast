import React from 'react';
import {downloadUrl} from 'services/constants';
import {LoginProps} from 'components/Login';
import ConnectionLogging from 'components/Login/ConnectionLogging';
import CredentialsButton from 'components/Login/CredentialsButton';
import CredentialsRequired from 'components/Login/CredentialsRequired';
import ExternalLink from 'components/ExternalLink';
import LoginButton from 'components/Login/LoginButton';
import ServiceLink from 'components/Login/ServiceLink';
import soundcloudSettings from '../soundcloudSettings';
import useCredentials from './useCredentials';

export default function SoundCloudLogin({service: soundcloud}: LoginProps) {
    const {clientId, secret} = useCredentials();

    return (
        <>
            {clientId && (soundcloudSettings.credentialsLocked || secret) ? (
                <>
                    <LoginNotRequired />
                    <LoginButton service={soundcloud} />
                </>
            ) : (
                <>
                    <CredentialsRequired service={soundcloud} />
                    <CredentialsButton service={soundcloud} />
                    <p className="login-download">
                        Download the <ExternalLink href={downloadUrl}>desktop app</ExternalLink> if
                        you are unable to register a {soundcloud.name} app.
                        <br />
                        or use <ExternalLink href="https://ampcast.app">ampcast.app</ExternalLink>.
                    </p>
                    <LoginNotRequired />
                </>
            )}
            <ServiceLink service={soundcloud} />
            <ConnectionLogging service={soundcloud} />
        </>
    );
}

function LoginNotRequired() {
    return (
        <p>
            You can still play music from SoundCloud without being logged in.
            <br />
            But you need to be logged in to search for music and access your playlists.
        </p>
    );
}
