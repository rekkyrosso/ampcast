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
        } else if (error) {
            const message = getErrorMessage(error);
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

function formatNumber(value = 0): string {
    value = Number(value);
    if (value < 10_000) {
        return String(value);
    } else {
        return value.toLocaleString();
    }
}

const statusCodes: Record<number, string> = {
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not found',
    408: 'Timeout',
    429: 'Too many requests',
    500: 'Internal server error',
    502: 'Bad gateway',
    503: 'Service unavailable',
    504: 'Timeout',
};

function getErrorMessage(error: any): string {
    return String(
        error.message || error.statusText || statusCodes[error.status] || error.status || ''
    );
}
