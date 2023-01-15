import {useCallback, useEffect, useState} from 'react';
import useNodeIds from './useNodeIds';
import {TreeNode} from './TreeView';
import useTreeViewState from './useTreeViewState';

export default function useExpandedNodeIds(nodes: TreeNode<any>[], storageId?: string) {
    const {storeExpandedState, retrieveExpandedState} = useTreeViewState(storageId);
    const allIds = useNodeIds(nodes);
    const [expandedIds, setExpandedIds] = useState<string[]>(() => {
        return getInitialExpandedNodeIds(nodes, retrieveExpandedState);
    });

    useEffect(() => {
        // Make sure that `expandedIds` are included in `allIds`.
        const newIds = expandedIds.filter((id) => allIds.includes(id));
        if (newIds.length !== expandedIds.length) {
            setExpandedIds(newIds);
        }
    }, [allIds, expandedIds]);

    const toggle = useCallback(
        (id: string, force?: boolean) => {
            const isExpanded = expandedIds.includes(id);
            if (isExpanded !== force) {
                if (isExpanded) {
                    setExpandedIds(expandedIds.filter((nodeId) => nodeId !== id));
                } else {
                    setExpandedIds(expandedIds.concat(id));
                }
                storeExpandedState(id, !isExpanded);
            }
        },
        [expandedIds, storeExpandedState]
    );

    return {expandedIds, toggle};
}

function getInitialExpandedNodeIds(
    nodes: TreeNode<any>[],
    retrieveExpandedState: (nodeId: string, defaultExpanded?: boolean) => boolean
): string[] {
    return nodes.reduce<string[]>((expandedIds, node) => {
        if (retrieveExpandedState(node.id, node.startExpanded)) {
            expandedIds.push(node.id);
        }
        if (node.children) {
            return expandedIds.concat(
                getInitialExpandedNodeIds(node.children, retrieveExpandedState)
            );
        }
        return expandedIds;
    }, []);
}
