import React from 'react';
import MediaService from 'types/MediaService';
import ProgressRing from 'components/MediaList/ProgressRing';
import PageHeader from './PageHeader';
import './LibraryLoadingScreen.scss';

export interface LibraryLoadingScreenProps {
    service: MediaService;
}

export default function LibraryLoadingScreen({service}: LibraryLoadingScreenProps) {
    return (
        <>
            <PageHeader icon={service.icon}>{service.name}</PageHeader>
            <div className="panel">
                <div className="page library-loading-screen">
                    <div className="note">
                        <p className="loading-text">
                            <ProgressRing busy progress={0} />
                            Loading library…
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
