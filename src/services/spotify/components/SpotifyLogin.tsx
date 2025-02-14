import React from 'react';
import {LoginProps} from 'components/Login';
import CredentialsButton from 'components/Login/CredentialsButton';
import CredentialsRequired from 'components/Login/CredentialsRequired';
import RestrictedAccessWarning from 'components/Login/RestrictedAccessWarning';
import LoginButton from 'components/Login/LoginButton';
import ServiceLink from 'components/Login/ServiceLink';
import useCredentials from './useCredentials';
import {isSafeOrigin} from '../spotifyApi';
import SpotifyRedirectType from '../SpotifyRedirectType';

export default function SpotifyLogin({service: spotify}: LoginProps) {
    const {clientId, redirectType} = useCredentials();
    const hasDeprecatedRedirect =
        !isSafeOrigin() && redirectType === SpotifyRedirectType.Origin;

    return (
        <>
            {clientId ? (
                <>
                    <RestrictedAccessWarning service={spotify} />
                    <p>You need to be logged in to play music from Spotify.*</p>
                    <LoginButton service={spotify} />
                    <p>
                        <small>*Spotify Premium required.</small>
                    </p>
                </>
            ) : (
                <>
                    <CredentialsRequired service={spotify} />
                    <p>
                        <CredentialsButton service={spotify} />
                    </p>
                </>
            )}
            <ServiceLink service={spotify} />
            {clientId && hasDeprecatedRedirect ? (
                <DeprecatedRedirectWarning service={spotify} />
            ) : null}
        </>
    );
}

function DeprecatedRedirectWarning({service: spotify}: Pick<LoginProps, 'service'>) {
    return (
        <div className="note credentials-required">
            <p>
                You are using a <strong>deprecated</strong> redirect URI.
            </p>
            <p>
                Please update your{' '}
                <CredentialsButton className="credentials-link" service={spotify}>
                    credentials
                </CredentialsButton>
                .
            </p>
        </div>
    );
}
