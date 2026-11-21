import Action from './Action';

type LibraryAction =
    | Action.AddToLibrary
    | Action.RemoveFromLibrary
    | Action.Rate
    | Action.Follow
    | Action.Unfollow;

export default LibraryAction;
