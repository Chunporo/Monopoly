import { IGameService } from './GameService';
import { ISocket } from '../assets/sockets';

export class GameServiceSocket implements ISocket {
    public id: string;
    public events: Map<string, (args: any) => void>;
    private service: IGameService;

    constructor(service: IGameService) {
        this.service = service;
        this.id = service.getPlayerId();
        this.events = new Map();

        // Listen to game events and map them to socket events
        this.service.onGameEvent((event) => {
            const handler = this.events.get(event.type);
            if (handler) {
                handler(event.payload);
            }
        });
        
        // Listen to chat messages
        this.service.onChatMessage((message) => {
             const handler = this.events.get('message');
             if (handler) {
                 handler(message);
             }
        });

        // Listen to player updates
        this.service.onPlayerUpdate((players) => {
             const handler = this.events.get('player_update');
             if (handler) {
                 players.forEach(p => {
                     handler({ playerId: p.id, pJson: p });
                 });
             }
        });
    }

    public on(event_name: string, handler: (args: any) => void) {
        this.events.set(event_name, handler);
    }

    public emit(event_name: string, args?: any) {
        // Map socket emits to service actions
        switch (event_name) {
            case 'roll_dice':
                this.service.rollDice();
                break;
            case 'buy_property':
                this.service.buyProperty(args);
                break;
            case 'buy_back':
                this.service.buyBackProperty(args.location, args.fromPlayerId, args.price);
                break;
            case 'end_turn':
                this.service.endTurn();
                break;
            case 'message':
                this.service.sendChatMessage(args);
                break;
            // Add other mappings as needed
            default:
                console.warn(`Unhandled emit: ${event_name}`, args);
        }
    }

    public disconnect() {
        this.service.disconnect();
        const handler = this.events.get('disconnect');
        if (handler) {
            handler(undefined);
        }
    }
}
