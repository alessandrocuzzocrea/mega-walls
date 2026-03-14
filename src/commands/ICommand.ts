export abstract class ICommand {
    abstract execute(): void;
    abstract undo(): void;
    abstract name: string;
}
