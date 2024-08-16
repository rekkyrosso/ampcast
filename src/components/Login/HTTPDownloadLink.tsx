import React from 'react';
import ServiceType from 'types/ServiceType';
import {dockerUrl, downloadUrl} from 'services/constants';
import ExternalLink from 'components/ExternalLink';
import {LoginProps} from './Login';

export default function HTTPDownloadLink({service}: LoginProps) {
    const showDownloadLink =
        location.protocol === 'https:' &&
        service.serviceType === ServiceType.PersonalMedia && service.id !== 'plex';

    return showDownloadLink ? (
        <>
            <p className="login-download">
                Download the <ExternalLink href={downloadUrl}>desktop app</ExternalLink> if you are unable
                to login via HTTPS
                <br />
                or use the <ExternalLink href={dockerUrl}>docker image</ExternalLink>.
            </p>
        </>
    ) : null;
}
