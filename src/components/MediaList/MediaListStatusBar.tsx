import React from 'react';
import MediaObject from 'types/MediaObject';
import StatusBar from 'components/StatusBar';

export interface MediaListStatusBarProps {
    items: readonly MediaObject[];
    size?: number;
    maxSize?: number;
    error?: unknown;
    loading?: boolean;
    loadingText?: string; // e.g. "Loading", "Searching"
    selectedCount?: number;
    itemName?: string;
    itemNamePlural?: string;
}

export default function MediaListStatusBar({
    items,
    size,
    maxSize,
    error,
    loading,
    loadingText = 'Loading',
    selectedCount,
    itemName = 'item',
    itemNamePlural = itemName + 's',
}: MediaListStatusBarProps) {
    let statusText: React.ReactNode = '';

    if (loading) {
        statusText = <span className="message">{loadingText}...</span>;
    } else {
        if (items.length > 0) {
            const itemCount = getArrayCount(items);
            const selection = <span className="selected">({selectedCount} selected)</span>;
            const message =
                itemCount === size
                    ? `${size.toLocaleString()} ${size === 1 ? itemName : itemNamePlural}`
                    : `Loaded ${itemCount} of ${
                          size === undefined
                              ? maxSize || `${items.length}+`
                              : maxSize
                              ? Math.min(size, maxSize)
                              : size
                      } ${itemNamePlural}`;
            statusText = (
                <span className="message">
                    {message} {selection}
                </span>
            );
        } else if (error) {
            const message = (error as any)?.message;
            statusText = <span className="error">{message ? `Error: ${message}` : 'Error'}</span>;
        } else {
            statusText = <span className="message">0 {itemNamePlural}</span>;
        }
    }

    return <StatusBar>{statusText}</StatusBar>;
}

function getArrayCount(array: readonly any[]): number {
    // Counts items in a sparse array.
    return array.reduce((total) => (total += 1), 0);
}
