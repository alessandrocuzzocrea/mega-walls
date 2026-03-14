import { ICommand } from './ICommand';

export class CompositeCommand implements ICommand {
    name: string;
    private commands: ICommand[];

    constructor(name: string, commands: ICommand[]) {
        this.name = name;
        this.commands = commands;
    }

    execute() {
        for (const command of this.commands) {
            command.execute();
        }
    }

    toString() {
        return `${this.name} (${this.commands.length} actions)`;
    }

    undo() {
        // Undo in reverse order
        for (let i = this.commands.length - 1; i >= 0; i--) {
            this.commands[i].undo();
        }
    }
}
