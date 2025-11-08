import React, {useCallback, useRef, useState} from 'react';
import {Field} from 'types/MediaListLayout';
import Dialog, {DialogProps, showDialog} from 'components/Dialog';
import DialogButtons from 'components/Dialog/DialogButtons';
import ListBox from 'components/ListView/ListBox';
import {FieldSpec} from './useMediaListLayout';
import './EditFieldsDialog.scss';

export async function showEditFieldsDialog(
    visibleFields: readonly FieldSpec[],
    hiddenFields: readonly FieldSpec[]
): Promise<readonly Field[] | undefined> {
    const fields = await showDialog((props: DialogProps) => (
        <EditFieldsDialog {...props} visibleFields={visibleFields} hiddenFields={hiddenFields} />
    ));
    return fields ? JSON.parse(fields) : undefined;
}

export interface EditFieldsDialogProps extends DialogProps {
    visibleFields: readonly FieldSpec[];
    hiddenFields: readonly FieldSpec[];
}

export default function EditFieldsDialog({
    visibleFields,
    hiddenFields,
    ...props
}: EditFieldsDialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [hidden, setHidden] = useState(() => hiddenFields.slice().sort(sorter));
    const [visible, setVisible] = useState(visibleFields);
    const [hiddenSelected, setHiddenSelected] = useState<readonly FieldSpec[]>([]);
    const [visibleSelected, setVisibleSelected] = useState<readonly FieldSpec[]>([]);

    const renderItem = useCallback(
        (field: FieldSpec) => (field.id === 'IconTitle' ? 'Title' : field.id),
        []
    );

    const hideFields = useCallback((fields: readonly FieldSpec[]) => {
        setVisible((visibleFields) => visibleFields.filter((field) => !fields.includes(field)));
        setHidden((hiddenFields) => hiddenFields.concat(fields).sort(sorter));
    }, []);

    const showFields = useCallback((fields: readonly FieldSpec[]) => {
        setVisible((visibleFields) => visibleFields.concat(fields));
        setHidden((hiddenFields) =>
            hiddenFields.filter((field) => !fields.includes(field)).sort(sorter)
        );
    }, []);

    const showField = useCallback(
        (field: FieldSpec) => {
            showFields([field]);
        },
        [showFields]
    );

    const hideField = useCallback(
        (field: FieldSpec) => {
            hideFields([field]);
        },
        [hideFields]
    );

    const moveFields = useCallback((selection: readonly FieldSpec[], toIndex: number) => {
        setVisible((visibleFields) => {
            const insertBeforeField = visibleFields[toIndex];
            if (selection.includes(insertBeforeField)) {
                // selection hasn't moved
                return visibleFields;
            }
            const newFields = visibleFields.filter((item) => !selection.includes(item));
            const insertAtIndex = newFields.indexOf(insertBeforeField);
            if (insertAtIndex >= 0) {
                newFields.splice(insertAtIndex, 0, ...selection);
                return newFields;
            } else {
                return newFields.concat(selection);
            }
        });
    }, []);

    const handleDropHide = useCallback(
        (fields: readonly FieldSpec[] | readonly File[] | DataTransferItem) => {
            if (Array.isArray(fields)) {
                hideFields(fields as FieldSpec[]);
            }
        },
        [hideFields]
    );

    const handleDropShow = useCallback(
        (fields: readonly FieldSpec[] | readonly File[] | DataTransferItem, atIndex: number) => {
            if (Array.isArray(fields)) {
                showFields(fields);
                moveFields(fields, atIndex);
            }
        },
        [showFields, moveFields]
    );

    const handleMoveUpClick = useCallback(() => {
        if (visibleSelected.length > 0) {
            const index = visible.indexOf(visibleSelected[0]);
            if (index > 0) {
                moveFields(visibleSelected, index - 1);
            }
        }
    }, [moveFields, visible, visibleSelected]);

    const handleMoveDownClick = useCallback(() => {
        if (visibleSelected.length > 0) {
            const index = visible.indexOf(visibleSelected.at(-1)!);
            if (index >= 0 && index < visible.length - 1) {
                moveFields(visibleSelected, index + 2);
            }
        }
    }, [moveFields, visible, visibleSelected]);

    const handleShowClick = useCallback(() => {
        showFields(hiddenSelected);
    }, [showFields, hiddenSelected]);

    const handleHideClick = useCallback(() => {
        hideFields(visibleSelected);
    }, [hideFields, visibleSelected]);

    const handleSubmit = useCallback(
        (event: React.FormEvent) => {
            event.preventDefault();
            dialogRef.current!.close(JSON.stringify(visible.map((field) => field.id)));
        },
        [visible]
    );

    return (
        <Dialog
            {...props}
            className="edit-fields-dialog"
            icon="settings"
            title="Edit fields"
            ref={dialogRef}
        >
            <form method="dialog" onSubmit={handleSubmit}>
                <div className="edit-fields">
                    <div className="hidden-fields">
                        <h3>Hidden:</h3>
                        <ListBox<FieldSpec>
                            title="Hidden fields"
                            items={hidden}
                            itemKey="id"
                            draggable={true}
                            droppable={true}
                            multiple={true}
                            renderItem={renderItem}
                            onDoubleClick={showField}
                            onDrop={handleDropHide}
                            onEnter={showFields}
                            onSelect={setHiddenSelected}
                        />
                    </div>
                    <p className="edit-fields-buttons">
                        <button type="button" onClick={handleShowClick}>
                            Show »
                        </button>
                        <button type="button" onClick={handleHideClick}>
                            « Hide
                        </button>
                    </p>
                    <div className="visible-fields">
                        <h3>Visible:</h3>
                        <ListBox<FieldSpec>
                            title="Visible fields"
                            items={visible}
                            itemKey="id"
                            draggable={true}
                            droppable={true}
                            moveable={true}
                            multiple={true}
                            renderItem={renderItem}
                            onDelete={hideFields}
                            onDoubleClick={hideField}
                            onDrop={handleDropShow}
                            onMove={moveFields}
                            onSelect={setVisibleSelected}
                        />
                        <p className="visible-fields-buttons">
                            <button className="small" type="button" onClick={handleMoveUpClick}>
                                Move up
                            </button>
                            <button className="small" type="button" onClick={handleMoveDownClick}>
                                Move down
                            </button>
                        </p>
                    </div>
                </div>
                <DialogButtons disabled={visible.length === 0} />
            </form>
        </Dialog>
    );
}

function sorter(a: FieldSpec, b: FieldSpec): number {
    const aId = a.id === 'IconTitle' ? 'Title' : a.id;
    const bId = b.id === 'IconTitle' ? 'Title' : b.id;
    if (aId === 'Index') {
        return -1;
    } else if (bId === 'Index') {
        return 1;
    } else {
        return aId.localeCompare(bId);
    }
}
