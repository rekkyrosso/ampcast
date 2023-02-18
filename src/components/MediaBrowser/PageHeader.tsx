import React from 'react';
import {IconName} from 'components/Icon';
import MediaSourceLabel from 'components/MediaSources/MediaSourceLabel';
import './PageHeader.scss';

export interface PageHeaderProps {
    icon: IconName;
    children: React.ReactNode;
}

export default function PageHeader({icon, children}: PageHeaderProps) {
    return (
        <h2 className="page-header">
            <MediaSourceLabel icon={icon} text={children} />
        </h2>
    );
}
