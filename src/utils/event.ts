export function cancelEvent(event: Event | React.SyntheticEvent): void {
    event.preventDefault();
    event.stopPropagation();
}

export function preventDefault(event: Event | React.SyntheticEvent): void {
    event.preventDefault();
}

export function stopPropagation(event: Event | React.SyntheticEvent): void {
    event.stopPropagation();
}
