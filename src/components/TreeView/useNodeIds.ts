import {useMemo} from 'react';
import {TreeNode} from './TreeView';

export default function useNodeIds(nodes: readonly TreeNode<any>[]) {
    return useMemo(() => getNodeIds(nodes), [nodes]);
}

function getNodeIds(nodes: readonly TreeNode<any>[]): string[] {
    return nodes.reduce<string[]>((nodeIds, node) => {
        nodeIds.push(node.id);
        if (node.children) {
            return nodeIds.concat(getNodeIds(node.children));
        }
        return nodeIds;
    }, []);
}
