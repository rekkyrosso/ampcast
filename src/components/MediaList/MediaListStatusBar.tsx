import React, {useEffect, useState} from 'react';
import MediaObject from 'types/MediaObject';
import {clamp} from 'utils';
import {getReadableErrorMessage, MediaSourceError} from 'services/errors';
import StatusBar from 'components/StatusBar';
import ProgressRing from './ProgressRing';
import './MediaListStatusBar.scss';

export interface MediaListStatusBarProps {
    items: readonly MediaObject[];
    size?: number;
    maxSize?: number;
    busy?: boolean;
    error?: unknown;
    loading?: boolean;
    loadingText?: string; // e.g. "Loading", "Searching"
    selectedCount?: number;
    itemName?: string;
    itemNamePlural?: string;
    icons?: readonly React.ReactNode[];
}

export default function MediaListStatusBar({
    items,
    size,
    maxSize,
    busy,
    error,
    loading,
    loadingText = 'Loading',
    selectedCount,
    itemName = 'item',
    itemNamePlural = itemName + 's',
    icons,
}: MediaListStatusBarProps) {
    const [pageSize, setPageSize] = useState(0);
    const itemCount = getArrayCount(items);
    const progress = getProgress(itemCount, size === undefined ? maxSize : size, pageSize || 50);
    const isWarning = error instanceof MediaSourceError;
    let statusText: React.ReactNode = '';

    useEffect(() => {
        if (!pageSize && itemCount) {
            setPageSize(itemCount);
        }
    }, [pageSize, itemCount]);

    if (loading) {
        statusText = <span className="message">{loadingText}…</span>;
    } else {
        if (isWarning) {
            statusText = <span className="message">{error.message}</span>;
        } else if (error) {
            const message = getReadableErrorMessage(error);
            statusText = (
                <span className="message error">{`Error: ${message}`}</span>
            );
        } else if (itemCount === 0) {
            statusText = <span className="message">0 {itemNamePlural}</span>;
        } else {
            const selection = (
                <span className="selected">({formatNumber(selectedCount)} selected)</span>
            );
            const message =
                itemCount === size
                    ? `${size.toLocaleString()} ${size === 1 ? itemName : itemNamePlural}`
                    : `Loaded ${formatNumber(itemCount)} of ${
                          size === undefined
                              ? maxSize || `${formatNumber(items.length)}+`
                              : maxSize
                              ? formatNumber(Math.min(size, maxSize))
                              : formatNumber(size)
                      } ${itemNamePlural}`;
            statusText = (
                <span className="message">
                    {message} {selection}
                </span>
            );
        }
    }

    return (
        <StatusBar className="media-list-status-bar">
            <p className="media-list-status-bar-text">
                {isWarning ? null : <ProgressRing busy={busy} error={error} progress={progress} />}
                {statusText}
            </p>
            <div className="media-list-status-bar-icons">
                {icons}
            </div>
        </StatusBar>
    );
}

function getArrayCount(array: readonly any[]): number {
    // Counts items in a sparse array.
    return array.reduce((total) => (total += 1), 0);
}

function formatNumber(value = 0): string {
    value = Number(value);
    if (value < 10_000) {
        return String(value);
    } else {
        return value.toLocaleString();
    }
}

function getProgress(count: number, size: number | undefined, pageSize: number) {
    if (count === size) {
        return 1;
    } else if (count === 0) {
        return 0;
    } else if (size) {
        return clamp(0.05, count / size, 0.95);
    } else {
        return clamp(0.1, count / (pageSize * 10), 0.9);
    }
}
