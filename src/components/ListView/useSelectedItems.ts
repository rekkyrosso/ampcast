import {useCallback, useEffect, useMemo, useState} from 'react';
import {ConditionalKeys} from 'type-fest';
import usePrevious from 'hooks/usePrevious';
import {compareArrays, exists} from 'utils';

export default function useSelectedItems<T>(
    items: readonly T[],
    itemKey: ConditionalKeys<T, string | number>,
    rowIndex: number
) {
    const prevItems = usePrevious(items);
    const [selectedItems, setSelectedItems] = useState<readonly T[]>([]);
    const selectedIds = useMemo(
        () => getSelectedIds(selectedItems, itemKey),
        [selectedItems, itemKey]
    );

    useEffect(() => {
        // Make sure that `selectedItems` is always a subset of `items`.
        if (items !== prevItems) {
            setSelectedItems((selectedItems) => {
                const selectedIds = getSelectedIds(selectedItems, itemKey);
                const newSelectedItems = items.filter(
                    (item) => (item[itemKey] as string) in selectedIds
                );
                if (compareArrays(selectedItems, newSelectedItems) && prevItems?.length) {
                    return selectedItems;
                }
                const size = items.length;
                if (size > 0 && newSelectedItems.length === 0) {
                    if (rowIndex < size) {
                        const item = items[rowIndex];
                        return item ? [item] : [];
                    } else {
                        const item = items[size - 1];
                        return item ? [item] : [];
                    }
                } else {
                    return newSelectedItems;
                }
            });
        }
    }, [prevItems, items, itemKey, rowIndex]);

    const selectAll = useCallback(() => {
        setSelectedItems((selectedItems) => {
            const newSelectedItems = items.filter(exists);
            if (compareArrays(selectedItems, newSelectedItems)) {
                return selectedItems;
            }
            return newSelectedItems;
        });
    }, [items]);

    const selectAt = useCallback(
        (index: number) => {
            setSelectedItems((selectedItems) => {
                const item = items[index];
                const newSelectedItems = item ? [item] : [];
                if (compareArrays(selectedItems, newSelectedItems)) {
                    return selectedItems;
                }
                return newSelectedItems;
            });
        },
        [items]
    );

    const selectRange = useCallback(
        (firstIndex: number, lastIndex: number) => {
            setSelectedItems((selectedItems) => {
                const start = Math.min(firstIndex, lastIndex);
                const end = Math.max(firstIndex, lastIndex);
                const newSelectedItems = items.slice(start, end + 1).filter(exists);
                if (compareArrays(selectedItems, newSelectedItems)) {
                    return selectedItems;
                }
                return newSelectedItems;
            });
        },
        [items]
    );

    const toggleSelectionAt = useCallback(
        (index: number) => {
            setSelectedItems((selectedItems) => {
                const toggledItem = items[index];
                const hasItem = selectedItems.includes(toggledItem);
                if (hasItem) {
                    return selectedItems.filter((selected) => selected !== toggledItem);
                } else {
                    // Preserve item order in selected items
                    return items.filter(
                        (item) => selectedItems.includes(item) || item === toggledItem
                    );
                }
            });
        },
        [items]
    );

    return {selectedItems, selectedIds, selectAll, selectAt, selectRange, toggleSelectionAt};
}

function getSelectedIds<T>(
    items: readonly T[],
    itemKey: ConditionalKeys<T, string | number>
): Record<string, boolean> {
    const selectedIds: Record<string, boolean> = {};
    for (const item of items) {
        selectedIds[item[itemKey] as string] = true;
    }
    return selectedIds;
}
