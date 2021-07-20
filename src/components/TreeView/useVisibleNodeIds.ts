import {useMemo} from 'react';
import {TreeNode} from './TreeView';

export default function useVisibleNodeIds(nodes: TreeNode<any>[], expandedIds: string[]) {
    return useMemo(() => getVisibleNodeIds(nodes, expandedIds), [nodes, expandedIds]);
}

// Nodes that are not hidden in collapsed parents.
function getVisibleNodeIds(nodes: TreeNode<any>[], expandedIds: string[]): string[] {
    return nodes.reduce<string[]>((nodeIds, node) => {
        nodeIds.push(node.id);
        if (node.children && expandedIds.includes(node.id)) {
            return nodeIds.concat(getVisibleNodeIds(node.children, expandedIds));
        }
        return nodeIds;
    }, []);
}
