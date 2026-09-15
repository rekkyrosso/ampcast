import type {Observable} from 'rxjs';
import {BehaviorSubject} from 'rxjs';
import type {PlaylistExportProgress} from 'types/AmpcastElectron';
import ampcastElectron from 'services/ampcastElectron';

export interface PlaylistExportState extends PlaylistExportProgress {
    canceling: boolean;
    name: string;
    queued: number;
}

const exportState$ = new BehaviorSubject<PlaylistExportState | null>(null);

export function observePlaylistExportState(): Observable<PlaylistExportState | null> {
    return exportState$;
}

export function getPlaylistExportState(): PlaylistExportState | null {
    return exportState$.value;
}

export function startPlaylistExport(
    operationId: string,
    name: string,
    total: number,
    queued: number
): void {
    exportState$.next({
        operationId,
        completed: 0,
        total,
        title: 'Waiting for the first completed track…',
        bytesWritten: 0,
        canceling: false,
        name,
        queued,
    });
}

export function setPlaylistExportQueueLength(queued: number): void {
    const current = exportState$.value;
    if (current) {
        exportState$.next({...current, queued});
    }
}

export function updatePlaylistExport(update: PlaylistExportProgress): void {
    const current = exportState$.value;
    if (current?.operationId === update.operationId) {
        exportState$.next({
            ...current,
            ...update,
            title: update.title || current.title,
        });
    }
}

export function cancelPlaylistExport(): void {
    const current = exportState$.value;
    if (current && !current.canceling) {
        exportState$.next({...current, canceling: true});
        ampcastElectron?.cancelPlaylistExport(current.operationId);
    }
}

export function finishPlaylistExport(operationId: string): void {
    if (exportState$.value?.operationId === operationId) {
        exportState$.next(null);
    }
}
