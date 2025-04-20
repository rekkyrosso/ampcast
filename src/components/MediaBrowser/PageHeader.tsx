import React, {useCallback, useRef} from 'react';
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
    const ref = useRef<HTMLHeadingElement>(null);

    const handleMenuClick = useCallback(
        async (event: React.MouseEvent<HTMLButtonElement>) => {
            const {right} = ref.current!.getBoundingClientRect();
            const {bottom} = (event.target as HTMLButtonElement).getBoundingClientRect();
            await showMediaSourceOptions(source!, right, bottom + 4);
        },
        [source]
    );

    return (
        <h2 className="page-header" ref={ref}>
            <MediaSourceLabel icon={icon} text={children} />
            {source?.sortOptions ? (
                <IconButton title="Options…" icon="menu" onClick={handleMenuClick} />
            ) : null}
        </h2>
    );
}
