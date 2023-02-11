import React from 'react';
import ExternalLink from 'components/ExternalLink';
import Icon from 'components/Icon';
import {LoginProps} from './Login';

export default function ServiceLink({service}: LoginProps) {
    return (
        <p className="service-link">
            <Icon name={service.icon} />
            <ExternalLink href={service.url} />
        </p>
    );
}
