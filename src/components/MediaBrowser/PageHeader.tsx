import React, {useCallback} from 'react';
import MediaSource from 'types/MediaSource';
import IconButton from 'components/Button';
import {IconName} from 'components/Icon';
import MediaSourceLabel from 'components/MediaSources/MediaSourceLabel';
import showMediaSourceOptions from './showMediaSourceOptions';
import './PageHeader.scss';

export interface PageHeaderProps {
    icon: IconName;
    source?: MediaSource<any>;
    children: React.ReactNode;
}

export default function PageHeader({icon, source, children}: PageHeaderProps) {
    const handleMenuClick = useCallback(
        async (event: React.MouseEvent<HTMLButtonElement>) => {
            const button = (event.target as HTMLButtonElement).closest('button')!;
            const {right} = button.getBoundingClientRect();
            const {bottom} = (event.target as HTMLButtonElement).getBoundingClientRect();
            await showMediaSourceOptions(source!, button, right, bottom + 4);
        },
        [source]
    );

    return (
        <h2 className="page-header">
            <MediaSourceLabel icon={icon} text={children} />
            {source?.sortOptions ? (
                <IconButton title="Options…" icon="menu" onClick={handleMenuClick} />
            ) : null}
        </h2>
    );
}
