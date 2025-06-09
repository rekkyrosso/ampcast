import React from 'react';
import MediaSource from 'types/MediaSource';
import {IconName} from 'components/Icon';
import MediaSourceLabel from 'components/MediaSources/MediaSourceLabel';
import MenuButton from './MenuButton';
import './PageHeader.scss';

export interface PageHeaderProps {
    icon: IconName;
    children: React.ReactNode;
    menuButtonSource?: MediaSource<any>;
}

export default function PageHeader({icon, menuButtonSource, children}: PageHeaderProps) {
    return (
        <h2 className="page-header">
            <MediaSourceLabel icon={icon} text={children} />
            {menuButtonSource ? <MenuButton source={menuButtonSource} /> : null}
        </h2>
    );
}
