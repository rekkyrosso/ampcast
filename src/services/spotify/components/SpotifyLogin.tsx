import React, {useCallback} from 'react';
import {spotifyCreateAppUrl} from 'services/constants';
import {sp_client_id} from 'services/credentials';
import {LoginProps} from 'components/Login';
import CredentialsRequired from 'components/Login/CredentialsRequired';
import DevMode from 'components/Login/DevMode';
import LoginButton from 'components/Login/LoginButton';
import ServiceLink from 'components/Login/ServiceLink';
import {showDialog} from 'components/Dialog';
import SpotifyCredentialsDialog from './SpotifyCredentialsDialog';
import spotifySettings from '../spotifySettings';

export default function SpotifyLogin({service: spotify}: LoginProps) {
    const login = useCallback(async () => {
        if (!spotifySettings.clientId) {
            await showDialog(SpotifyCredentialsDialog, true);
        }
        if (spotifySettings.clientId) {
            await spotify.login();
        }
    }, [spotify]);

    return (
        <>
            {spotifySettings.clientId ? (
                sp_client_id ? (
                    <DevMode service={spotify} />
                ) : null
            ) : (
                <CredentialsRequired service={spotify} url={spotifyCreateAppUrl} />
            )}
            <p>You need to be logged in to play music from Spotify.*</p>
            <LoginButton service={spotify} onClick={login} />
            <p>
                <small>*Spotify Premium required.</small>
            </p>
            <ServiceLink service={spotify} />
        </>
    );
}
