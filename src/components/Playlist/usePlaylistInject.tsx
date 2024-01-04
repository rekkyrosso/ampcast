import React from 'react';
import getYouTubeID from 'get-youtube-id';
import MediaAlbum from 'types/MediaAlbum';
import MediaItem from 'types/MediaItem';
import {getService} from 'services/mediaServices';
import {createMediaItemFromFile, createMediaItemFromUrl} from 'services/music-metadata';
import {injectAt} from 'services/playlist';
import {getYouTubeVideoInfo} from 'services/youtube';
import MediaSourceLabel from 'components/MediaSources/MediaSourceLabel';
import {alert} from 'components/Dialog';
import {partition, Logger} from 'utils';

const logger = new Logger('usePlaylistInject');

const inject = {
    items: injectItems,
    files: injectFiles,
    urls: injectUrls,
    spotifyTracks: injectSpotifyTracks,
};

export default function usePlaylistInject() {
    return inject;
}

async function injectItems(items: readonly MediaItem[] | readonly MediaAlbum[], atIndex: number) {
    injectAt(items, atIndex);
}

async function injectUrls(urls: readonly string[], atIndex: number) {
    const [youtubeUrls, otherUrls] = partition(urls, (url) => !!getYouTubeID(url));
    const youtubeIds = youtubeUrls.map((url) => getYouTubeID(url)!);
    try {
        const items = await Promise.all([
            Promise.all(youtubeIds.map((id) => getYouTubeVideoInfo(id))),
            Promise.all(otherUrls.map((url) => createMediaItemFromUrl(url))),
        ]);
        await injectAt(items.flat(), atIndex);
    } catch (err: any) {
        await showError(err);
    }
}

async function injectFiles(files: FileList | readonly File[], atIndex: number) {
    try {
        if (files instanceof FileList) {
            files = Array.from(files);
        }
        const items = await Promise.all(files.map((file) => createMediaItemFromFile(file)));
        await injectAt(items, atIndex);
    } catch (err: any) {
        await showError(err);
    }
}

async function injectSpotifyTracks(trackIds: readonly string[], atIndex: number) {
    try {
        const spotify = getService('spotify');
        if (spotify?.getTracksById) {
            const items = await spotify.getTracksById(trackIds);
            await injectAt(items, atIndex);
        }
    } catch (err: any) {
        await showError(Error('Failed to load Spotify tracks.'));
    }
}

async function showError(error: any): Promise<void> {
    logger.error(error);
    const title = <MediaSourceLabel icon="error" text="Error" />;
    const defaultMessage = 'Media could not be loaded.';
    const message = error instanceof TypeError ? defaultMessage : error.message || defaultMessage;
    await alert({title, message});
}
