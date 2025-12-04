import React from 'react';
import {browser} from 'utils';
import {LoginProps} from 'components/Login';
import ConnectionLogging from 'components/Login/ConnectionLogging';
import CredentialsButton from 'components/Login/CredentialsButton';
import CredentialsRequired from 'components/Login/CredentialsRequired';
import LoginButton from 'components/Login/LoginButton';
import LoginRequired from 'components/Login/LoginRequired';
import SecureContextRequired from 'components/Login/SecureContextRequired';
import ServiceLink from 'components/Login/ServiceLink';
import useCredentials from './useCredentials';

export default function IBroadcastLogin({service: ibroadcast}: LoginProps) {
    const {clientId} = useCredentials();

    return window.isSecureContext ? (
        <>
            {clientId ? (
                <>
                    {browser.isAmpcastApp ? (
                        <div
                            className="note"
                            style={{fontSize: '0.75em', padding: '0.5em', lineHeight: 'normal'}}
                        >
                            <p>This application has not yet been approved by iBroadcast.</p>
                            <p>Some features might not work and you may experience rate limiting.</p>
                        </div>
                    ) : null}
                    <LoginRequired service={ibroadcast} />
                    <LoginButton service={ibroadcast} />
                </>
            ) : (
                <>
                    <CredentialsRequired service={ibroadcast} />
                    <CredentialsButton service={ibroadcast} />
                </>
            )}
            <ServiceLink service={ibroadcast} />
            <ConnectionLogging service={ibroadcast} />
        </>
    ) : (
        <>
            <SecureContextRequired service={ibroadcast} />
            <ServiceLink service={ibroadcast} />
        </>
    );
}
