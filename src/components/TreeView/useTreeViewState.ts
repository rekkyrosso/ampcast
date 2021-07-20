import {useCallback} from 'react';

export default function useTreeViewState(storeId?: string) {
    const storeExpandedState = useCallback(
        (nodeId: string, expanded: boolean): void => {
            if (storeId) {
                localStorage.setItem(`${storeId}/${nodeId}`, String(!!expanded));
            }
        },
        [storeId]
    );

    const retrieveExpandedState = useCallback(
        (nodeId: string, defaultExpanded = false): boolean => {
            if (storeId) {
                const expanded = localStorage.getItem(`${storeId}/${nodeId}`);
                return typeof expanded === 'string' ? expanded === 'true' : defaultExpanded;
            }
            return defaultExpanded;
        },
        [storeId]
    );

    const storeSelectedNodeId = useCallback(
        (nodeId: string): void => {
            if (storeId) {
                localStorage.setItem(`${storeId}/selectedId`, nodeId);
            }
        },
        [storeId]
    );

    const retrieveSelectedNodeId = useCallback(
        (defaultId: string): string => {
            if (storeId) {
                return localStorage.getItem(`${storeId}/selectedId`) || defaultId;
            }
            return defaultId;
        },
        [storeId]
    );

    return {storeExpandedState, retrieveExpandedState, storeSelectedNodeId, retrieveSelectedNodeId};
}
