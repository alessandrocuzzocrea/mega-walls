import type { ICommand } from '../commands/ICommand';

export class CommandManager {
    private undoStack: ICommand[] = [];
    private redoStack: ICommand[] = [];
    private onStateChange: (() => void) | null = null;

    constructor(onStateChange?: () => void) {
        if (onStateChange) this.onStateChange = onStateChange;
    }

    execute(command: ICommand) {
        console.log(`Executing: ${command.toString()}`);
        command.execute();
        this.undoStack.push(command);
        this.redoStack = []; // Clear redo stack on new command
        this.notify();
    }

    undo() {
        const command = this.undoStack.pop();
        if (command) {
            console.log(`Undoing: ${command.toString()}`);
            command.undo();
            this.redoStack.push(command);
            this.notify();
        }
    }

    redo() {
        const command = this.redoStack.pop();
        if (command) {
            console.log(`Redoing: ${command.toString()}`);
            command.execute();
            this.undoStack.push(command);
            this.notify();
        }
    }

    private notify() {
        if (this.onStateChange) {
            this.onStateChange();
        }
    }

    getUndoStack() {
        return [...this.undoStack];
    }

    getRedoStack() {
        return [...this.redoStack];
    }
}
