import {useCallback, useEffect, useState} from 'react';
import {TreeNode} from './TreeView';
import useTreeViewState from './useTreeViewState';

export default function useNodeIds(nodes: readonly TreeNode<any>[], storageId?: string) {
    const {storeExpandedState, retrieveExpandedState} = useTreeViewState(storageId);
    const [expandedIds, setExpandedIds] = useState<string[]>(() => {
        return getExpandedNodeIds(nodes, retrieveExpandedState);
    });
    const [visibleIds, setVisibleIds] = useState<string[]>(() => {
        return getVisibleNodeIds(nodes, expandedIds);
    });

    useEffect(() => {
        const expandedIds = getExpandedNodeIds(nodes, retrieveExpandedState);
        const visibleIds = getVisibleNodeIds(nodes, expandedIds);
        setExpandedIds(expandedIds);
        setVisibleIds(visibleIds);
    }, [nodes, retrieveExpandedState]);

    const toggle = useCallback(
        (id: string, force?: boolean) => {
            const isExpanded = expandedIds.includes(id);
            if (isExpanded !== force) {
                const newExpandedIds = isExpanded
                    ? expandedIds.filter((nodeId) => nodeId !== id)
                    : expandedIds.concat(id);
                const visibleIds = getVisibleNodeIds(nodes, newExpandedIds);
                setExpandedIds(newExpandedIds);
                setVisibleIds(visibleIds);
                storeExpandedState(id, !isExpanded);
            }
        },
        [nodes, expandedIds, storeExpandedState]
    );

    return {expandedIds, visibleIds, toggle};
}

// Nodes that are not hidden in collapsed parents.
function getVisibleNodeIds(nodes: readonly TreeNode<any>[], expandedIds: string[]): string[] {
    return nodes.reduce<string[]>((nodeIds, node) => {
        nodeIds.push(node.id);
        if (node.children && expandedIds.includes(node.id)) {
            return nodeIds.concat(getVisibleNodeIds(node.children, expandedIds));
        }
        return nodeIds;
    }, []);
}

function getExpandedNodeIds(
    nodes: readonly TreeNode<any>[],
    retrieveExpandedState: (nodeId: string, defaultExpanded?: boolean) => boolean
): string[] {
    return nodes.reduce<string[]>((expandedIds, node) => {
        if (retrieveExpandedState(node.id, node.startExpanded)) {
            expandedIds.push(node.id);
        }
        if (node.children) {
            return expandedIds.concat(getExpandedNodeIds(node.children, retrieveExpandedState));
        }
        return expandedIds;
    }, []);
}
