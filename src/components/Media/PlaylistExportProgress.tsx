import React from 'react';
import {PlaylistExportState, cancelPlaylistExport} from 'services/playlist/playlistExportProgress';
import IconButton from 'components/Button/IconButton';
import './PlaylistExportProgress.scss';

export interface PlaylistExportProgressProps {
    state: PlaylistExportState;
}

export default function PlaylistExportProgress({state}: PlaylistExportProgressProps) {
    const currentFraction =
        state.totalBytes && state.totalBytes > 0
            ? Math.min(state.bytesWritten / state.totalBytes, 1)
            : 0;
    const overallProgress = Math.min(
        (state.completed + currentFraction) / Math.max(state.total, 1),
        1
    );

    return (
        <section className="playlist-export-progress" aria-live="polite">
            <h2>Exporting “{state.name}” to MP3</h2>
            <p className="export-track-title">{state.title}</p>
            <progress value={overallProgress} max={1} />
            <p className="export-progress-label">
                {state.canceling
                    ? 'Canceling…'
                    : `${state.completed} of ${state.total} tracks completed`}
            </p>
            {state.queued ? (
                <p className="export-queue-label">
                    {state.queued} playlist{state.queued === 1 ? '' : 's'} queued
                </p>
            ) : null}
            <IconButton
                className="export-cancel-button"
                icon="close"
                aria-label={state.canceling ? 'Canceling export' : 'Cancel export'}
                title={state.canceling ? 'Canceling…' : 'Cancel export'}
                disabled={state.canceling}
                onClick={cancelPlaylistExport}
            />
        </section>
    );
}
