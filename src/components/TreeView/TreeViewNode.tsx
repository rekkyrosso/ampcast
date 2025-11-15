import React, {useCallback, useId} from 'react';
import {stopPropagation} from 'utils';
import {hasSelectedNode, TreeNode} from './TreeView';

export interface TreeViewNodeProps<T> extends TreeNode<T> {
    selectedId: string;
    expandedIds: string[];
    level: number;
    rowHeight: number;
    nodeIndex: number;
    setSize: number;
    emptyMarker?: boolean;
    showTooltip?: boolean;
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
    showTooltip,
    onSelect,
    onToggle,
}: TreeViewNodeProps<T>) {
    const rowId = useId();
    const expanded = expandedIds.includes(id);
    const expandable = children.length !== 0;
    const selected = id === selectedId;
    const classNames = `${expandable ? 'expandable' : ''} ${expanded ? 'expanded' : ''} ${
        selected ? 'selected' : ''
    } ${children.length === 0 ? 'empty' : ''}`;

    const handleMouseDown = useCallback(() => {
        onSelect?.(id);
    }, [id, onSelect]);

    const handleMouseEnter = useCallback(() => {
        const tooltip = document.getElementById(`tooltip-${rowId}`) as HTMLSpanElement;
        if (tooltip) {
            const label = document.getElementById(`tree-view-node-label-${rowId}`)!
                .firstElementChild as HTMLSpanElement;
            const rect = label.getBoundingClientRect();
            tooltip.style.left = `${rect.left}px`;
            tooltip.style.top = `${rect.top}px`;
            tooltip.showPopover();
        }
    }, [rowId]);

    const handleMouseLeave = useCallback(() => {
        const tooltip = document.getElementById(`tooltip-${rowId}`) as HTMLSpanElement;
        tooltip?.hidePopover();
    }, [rowId]);

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
            id={`tree-view-node-${rowId}`}
            role="treeitem"
            aria-selected={selected ? 'true' : undefined}
            aria-expanded={expanded ? 'true' : undefined}
            aria-labelledby={`tree-view-node-label-${rowId}`}
            aria-level={level}
            aria-setsize={setSize}
            aria-posinset={nodeIndex + 1}
        >
            <span
                className={`tree-view-row ${selected ? 'selected-text' : ''}`}
                onDoubleClick={expandable ? handleDoubleClick : undefined}
                onMouseDown={handleMouseDown}
                onMouseEnter={showTooltip ? handleMouseEnter : undefined}
                onMouseLeave={showTooltip ? handleMouseLeave : undefined}
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
                            className="tree-view-node-marker empty-marker"
                            viewBox="0 0 24 24"
                            onMouseDown={stopPropagation}
                        >
                            <circle cx="12" cy="12" r="4" />
                        </svg>
                    )
                )}
                <span className="tree-view-node-label" id={`tree-view-node-label-${rowId}`}>
                    {label}
                    {showTooltip ? (
                        <span className="tooltip" id={`tooltip-${rowId}`} popover="auto">
                            {label}
                        </span>
                    ) : null}
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
                            showTooltip={showTooltip}
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
