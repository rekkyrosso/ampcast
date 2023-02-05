import Action from './Action';

type LibraryAction = Extract<
    Action,
    Action.AddToLibrary | Action.RemoveFromLibrary | Action.Rate | Action.Like | Action.Unlike
>;

export default LibraryAction;
