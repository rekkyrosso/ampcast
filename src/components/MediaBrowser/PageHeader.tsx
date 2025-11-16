import React from 'react';
import MediaSource from 'types/MediaSource';
import {IconName} from 'components/Icon';
import MediaSourceLabel from 'components/MediaSources/MediaSourceLabel';
import MenuButtons from './MenuButtons';
import './PageHeader.scss';

export interface PageHeaderProps {
    icon: IconName;
    children: React.ReactNode;
    source?: MediaSource;
}

export default function PageHeader({icon, source, children}: PageHeaderProps) {
    return (
        <h2 className="page-header">
            <MediaSourceLabel icon={icon} text={children} />
            {source ? <MenuButtons source={source} /> : null}
        </h2>
    );
}
