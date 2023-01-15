import {useCallback} from 'react';

export default function useTreeViewState(storageId?: string) {
    const storeExpandedState = useCallback(
        (nodeId: string, expanded: boolean): void => {
            if (storageId) {
                localStorage.setItem(`${storageId}/${nodeId}`, String(!!expanded));
            }
        },
        [storageId]
    );

    const retrieveExpandedState = useCallback(
        (nodeId: string, defaultExpanded = false): boolean => {
            if (storageId) {
                const expanded = localStorage.getItem(`${storageId}/${nodeId}`);
                return typeof expanded === 'string' ? expanded === 'true' : defaultExpanded;
            }
            return defaultExpanded;
        },
        [storageId]
    );

    const storeSelectedNodeId = useCallback(
        (nodeId: string): void => {
            if (storageId) {
                localStorage.setItem(`${storageId}/selectedId`, nodeId);
            }
        },
        [storageId]
    );

    const retrieveSelectedNodeId = useCallback(
        (defaultId: string): string => {
            if (storageId) {
                return localStorage.getItem(`${storageId}/selectedId`) || defaultId;
            }
            return defaultId;
        },
        [storageId]
    );

    return {storeExpandedState, retrieveExpandedState, storeSelectedNodeId, retrieveSelectedNodeId};
}
