import React from 'react';
import ServiceType from 'types/ServiceType';
import {downloadUrl} from 'services/constants';
import ExternalLink from 'components/ExternalLink';
import {LoginProps} from './Login';

export default function HTTPDownloadLink({service}: LoginProps) {
    const showDownloadLink =
        location.protocol === 'https:' &&
        service.serviceType === ServiceType.PersonalMedia &&
        service.id !== 'plex';

    return showDownloadLink ? (
        <p className="login-download">
            <ExternalLink href={downloadUrl}>
                Download the app if you are unable to login via HTTPS
            </ExternalLink>
        </p>
    ) : null;
}
