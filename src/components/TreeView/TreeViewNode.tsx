import React, {useCallback} from 'react';
import {hasSelectedNode, TreeNode} from './TreeView';

export interface TreeViewNodeProps<T> extends TreeNode<T> {
    selectedId: string;
    expandedIds: string[];
    level: number;
    rowHeight: number;
    nodeIndex: number;
    setSize: number;
    emptyMarker?: boolean;
    onSelect?: (id: string) => void;
    onToggle?: (id: string) => void;
}

export default function TreeViewNode<T>({
    id,
    label,
    children = [],
    selectedId,
    expandedIds,
    level,
    rowHeight,
    nodeIndex,
    setSize,
    emptyMarker,
    onSelect,
    onToggle,
}: TreeViewNodeProps<T>) {
    const expanded = expandedIds.includes(id);
    const expandable = children.length !== 0;
    const selected = id === selectedId;
    const classNames = `${expandable ? 'expandable' : ''} ${expanded ? 'expanded' : ''} ${
        selected ? 'selected' : ''
    } ${children.length === 0 ? 'empty' : ''}`;

    const stopPropagation = useCallback((event: React.SyntheticEvent) => {
        event.stopPropagation();
    }, []);

    const handleMouseDown = useCallback(
        (event: React.MouseEvent) => {
            event.stopPropagation();
            onSelect?.(id);
        },
        [id, onSelect]
    );

    const handleDoubleClick = useCallback(
        (event: React.MouseEvent) => {
            event.stopPropagation();
            onToggle?.(id);
        },
        [id, onToggle]
    );

    const handleMarkerClick = useCallback(
        (event: React.MouseEvent) => {
            event.stopPropagation();
            onToggle?.(id);
            if (expanded && hasSelectedNode(children, selectedId)) {
                onSelect?.(id);
            }
        },
        [id, selectedId, expanded, children, onSelect, onToggle]
    );

    return (
        <li
            className={`tree-view-node ${classNames}`}
            id={`tree-view-node-${id}`}
            role="treeitem"
            aria-selected={selected ? 'true' : undefined}
            aria-expanded={expanded ? 'true' : undefined}
            aria-labelledby={`tree-view-node-label-${id}`}
            aria-level={level}
            aria-setsize={setSize}
            aria-posinset={nodeIndex + 1}
            onMouseDown={handleMouseDown}
        >
            <span
                className="tree-view-row"
                onDoubleClick={handleDoubleClick}
                style={{
                    height: `${rowHeight}px`,
                }}
            >
                {expandable ? (
                    <svg
                        className="tree-view-node-marker"
                        viewBox={`0 0 ${expanded ? 320 : 256} 512`}
                        onMouseDown={stopPropagation}
                        onClick={handleMarkerClick}
                    >
                        {expanded ? (
                            <path d="M143 352.3L7 216.3c-9.4-9.4-9.4-24.6 0-33.9l22.6-22.6c9.4-9.4 24.6-9.4 33.9 0l96.4 96.4 96.4-96.4c9.4-9.4 24.6-9.4 33.9 0l22.6 22.6c9.4 9.4 9.4 24.6 0 33.9l-136 136c-9.2 9.4-24.4 9.4-33.8 0z" />
                        ) : (
                            <path d="M224.3 273l-136 136c-9.4 9.4-24.6 9.4-33.9 0l-22.6-22.6c-9.4-9.4-9.4-24.6 0-33.9l96.4-96.4-96.4-96.4c-9.4-9.4-9.4-24.6 0-33.9L54.3 103c9.4-9.4 24.6-9.4 33.9 0l136 136c9.5 9.4 9.5 24.6.1 34z" />
                        )}
                    </svg>
                ) : (
                    emptyMarker && (
                        <svg
                            className="tree-view-node-marker"
                            viewBox="0 0 24 24"
                            onMouseDown={stopPropagation}
                        >
                            <circle cx="12" cy="12" r="4" />
                        </svg>
                    )
                )}
                <span className="tree-view-node-label" id={`tree-view-node-label-${id}`}>
                    {label}
                </span>
            </span>
            {expanded && (
                <ul className="tree-view-node-children" role="group">
                    {children.map(({id, ...props}, nodeIndex) => (
                        <TreeViewNode
                            {...props}
                            id={id}
                            selectedId={selectedId}
                            expandedIds={expandedIds}
                            level={level + 1}
                            rowHeight={rowHeight}
                            nodeIndex={nodeIndex}
                            setSize={children.length}
                            onSelect={onSelect}
                            onToggle={onToggle}
                            key={id}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
}
