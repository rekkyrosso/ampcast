import React, {useCallback, useId, useRef} from 'react';
import {copyToClipboard} from 'utils';
import {alert} from 'components/Dialog';
import CopyButton from 'components/Button/CopyButton';
import DialogButtons from 'components/Dialog/DialogButtons';
import Credentials from 'components/Settings/MediaLibrarySettings/Credentials';
import {MediaServiceCredentialsProps} from 'components/Settings/MediaLibrarySettings/MediaServiceCredentials';
import ExternalLink from 'components/ExternalLink';
import {isSafeOrigin} from '../spotifyApi';
import SpotifyRedirectType from '../SpotifyRedirectType';
import spotifySettings from '../spotifySettings';
import useCredentials from './useCredentials';

export default function SpotifyCredentials({service: spotify}: MediaServiceCredentialsProps) {
    const id = useId();
    const ref = useRef<HTMLFormElement>(null);
    const {clientId, redirectType} = useCredentials();
    const clientIdRef = useRef<HTMLInputElement>(null);
    const authPath = '/auth/spotify/callback/';
    const originalUrl = `${location.origin}${authPath}`;
    const localhostIp6Url = `http://[::1]:${location.port}${authPath}`;
    const deprecatedUrl =
        'https://developer.spotify.com/documentation/web-api/tutorials/migration-insecure-redirect-uri';

    const handleSubmit = useCallback(async () => {
        const clientId = clientIdRef.current!.value;
        const redirectType = Number(ref.current![`${id}-callback`]?.value);
        if (redirectType !== spotifySettings.redirectType) {
            spotifySettings.redirectType = redirectType;
            await alert({
                icon: 'spotify',
                title: 'Redirect URI changed',
                message: `Don't forget to update the settings in your Spotify app.`,
                system: true,
            });
        }
        if (clientId !== spotifySettings.clientId) {
            spotifySettings.clientId = clientId;
            if (spotify.isLoggedIn()) {
                await spotify.logout();
            }
        }
    }, [spotify, id]);

    return (
        <form className="spotify-credentials" method="dialog" onSubmit={handleSubmit} ref={ref}>
            <fieldset>
                <legend>Your App</legend>
                <Credentials
                    label="Client ID"
                    name="spotify-client-id"
                    defaultValue={clientId}
                    inputRef={clientIdRef}
                    autoFocus
                />
            </fieldset>
            <fieldset className="credentials-registration">
                <legend>Registration</legend>
                <p>
                    <ExternalLink icon="spotify" href={spotify.credentialsUrl} />
                </p>
            </fieldset>
            <fieldset className="credentials-requirements note">
                <legend>Requirements</legend>
                <p>Redirect URIs:</p>
                <ul>
                    <li className="credentials-callback">
                        <input
                            type="radio"
                            name={`${id}-callback`}
                            value={SpotifyRedirectType.Origin}
                            defaultChecked={redirectType === SpotifyRedirectType.Origin}
                            hidden={isSafeOrigin()}
                        />
                        <input type="text" value={originalUrl} readOnly />
                        {isSafeOrigin() ? (
                            <CopyButton onClick={() => copyToClipboard(originalUrl)} />
                        ) : (
                            <>
                                {/* eslint-disable-next-line react/jsx-no-target-blank */}
                                <a
                                    className="deprecated"
                                    href={deprecatedUrl}
                                    target="_blank"
                                    rel="noopener"
                                    title={deprecatedUrl}
                                >
                                    deprecated
                                </a>
                            </>
                        )}
                    </li>
                    {isSafeOrigin() ? null : (
                        <li className="credentials-callback">
                            <input
                                type="radio"
                                name={`${id}-callback`}
                                value={SpotifyRedirectType.LocalhostIp6}
                                defaultChecked={redirectType === SpotifyRedirectType.LocalhostIp6}
                            />
                            <input type="text" value={localhostIp6Url} readOnly />
                            <CopyButton onClick={() => copyToClipboard(localhostIp6Url)} />
                        </li>
                    )}
                </ul>
                <p>APIs used:</p>
                <ul>
                    <li>
                        <input type="checkbox" id={`${id}-api1`} checked readOnly />
                        <label htmlFor={`${id}-api1`}>Web API</label>
                    </li>
                    <li>
                        <input type="checkbox" id={`${id}-api2`} checked readOnly />
                        <label htmlFor={`${id}-api2`}>Web Playback SDK</label>
                    </li>
                </ul>
            </fieldset>
            <DialogButtons />
        </form>
    );
}
