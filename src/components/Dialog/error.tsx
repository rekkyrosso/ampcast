import React from 'react';
import MediaSourceLabel from 'components/MediaSources/MediaSourceLabel';
import alert from './alert';

export default async function error(message: string, system?: boolean): Promise<void> {
    await alert({
        title: <MediaSourceLabel icon="error" text="Error" />,
        message,
        system,
    });
}
