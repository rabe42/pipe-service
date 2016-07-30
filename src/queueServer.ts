
export class Queues {

    name: string;
    /**
     * Create a named queue. If the queue already exist, nothing will be done.
     */
    create(name: string): void {
        this.name = name;
    }
};