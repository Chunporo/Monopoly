/**
 * PeerJS Game Service Implementation
 * Wrapper around existing PeerJS implementation for backward compatibility
 */

import {
    IGameService,
    GameRoom,
    PlayerData,
    GameEvent,
    ChatMessage,
    TradeOffer
} from './GameService';
import { Socket, Server, io } from '../assets/sockets';
import { TranslateCode, code } from '../assets/code';

export class PeerJSGameService implements IGameService {
    private socket: Socket | null = null;
    private server: Server | null = null;
    private playerId: string = '';
    private currentRoom: GameRoom | null = null;
    private connected: boolean = false;
    private isHost: boolean = false;
    
    private eventCallbacks: ((event: GameEvent) => void)[] = [];
    private playerCallbacks: ((players: PlayerData[]) => void)[] = [];
    private chatCallbacks: ((message: ChatMessage) => void)[] = [];
    private disconnectCallbacks: (() => void)[] = [];

    async connect(): Promise<void> {
        // PeerJS connects when creating/joining room
        this.connected = true;
    }

    async disconnect(): Promise<void> {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        if (this.server) {
            this.server.stop();
            this.server = null;
        }
        this.connected = false;
    }

    isConnected(): boolean {
        return this.connected;
    }

    async createRoom(hostName: string, hostIcon: number, maxPlayers: number): Promise<GameRoom> {
        return new Promise((resolve, reject) => {
            this.isHost = true;
            
            // Import and run the server
            import('../assets/server').then(({ main }) => {
                main(maxPlayers, async (hostCode, server) => {
                    this.server = server;
                    server.code = hostCode;
                    
                    try {
                        // Connect to own server
                        this.socket = await io(TranslateCode(hostCode));
                        this.playerId = this.socket.id;
                        
                        // Setup event handlers
                        this.setupSocketHandlers();
                        
                        // Create room object
                        const room: GameRoom = {
                            id: hostCode,
                            code: hostCode,
                            hostId: this.playerId,
                            players: [],
                            gameState: {
                                currentPlayerId: '',
                                turnNumber: 0,
                                diceRolls: null,
                                lastAction: '',
                                history: []
                            },
                            maxPlayers,
                            createdAt: Date.now(),
                            status: 'waiting'
                        };
                        
                        this.currentRoom = room;
                        resolve(room);
                    } catch (error) {
                        reject(error);
                    }
                });
            });
        });
    }

    async joinRoom(roomCode: string, playerName: string, playerIcon: number): Promise<GameRoom> {
        return new Promise(async (resolve, reject) => {
            try {
                const address = TranslateCode(roomCode);
                this.socket = await io(address);
                this.playerId = this.socket.id;
                
                this.setupSocketHandlers();
                
                // Wait for state response
                this.socket.on('state', (state: number) => {
                    switch (state) {
                        case 0: // Success
                            const room: GameRoom = {
                                id: roomCode,
                                code: roomCode,
                                hostId: '',
                                players: [],
                                gameState: {
                                    currentPlayerId: '',
                                    turnNumber: 0,
                                    diceRolls: null,
                                    lastAction: '',
                                    history: []
                                },
                                maxPlayers: 6,
                                createdAt: Date.now(),
                                status: 'waiting'
                            };
                            this.currentRoom = room;
                            resolve(room);
                            break;
                        case 1:
                            reject(new Error('Game has already started'));
                            break;
                        case 2:
                            reject(new Error('Room is full'));
                            break;
                        default:
                            reject(new Error('Unknown error'));
                    }
                });
                
                // Send join info
                this.socket.emit('join', { name: playerName, icon: playerIcon });
                
            } catch (error) {
                reject(error);
            }
        });
    }

    async leaveRoom(): Promise<void> {
        if (this.socket) {
            this.socket.disconnect();
        }
        this.currentRoom = null;
    }

    async setReady(ready: boolean): Promise<void> {
        this.socket?.emit('ready', ready);
    }

    async startGame(): Promise<void> {
        this.socket?.emit('start_game');
    }

    async rollDice(): Promise<[number, number]> {
        return new Promise((resolve) => {
            this.socket?.emit('roll_dice');
            this.socket?.on('dice_result', (result: [number, number]) => {
                resolve(result);
            });
        });
    }

    async buyProperty(position: number): Promise<void> {
        this.socket?.emit('buy_property', { position });
    }

    async skipProperty(): Promise<void> {
        this.socket?.emit('skip_property');
    }

    async payRent(amount: number, toPlayerId: string): Promise<void> {
        this.socket?.emit('pay_rent', { amount, toPlayerId });
    }

    async movePlayer(position: number): Promise<void> {
        this.socket?.emit('move', { position });
    }

    async endTurn(): Promise<void> {
        this.socket?.emit('end_turn');
    }

    async payJailFee(): Promise<void> {
        this.socket?.emit('unjail', 'pay');
    }

    async useGetOutCard(): Promise<void> {
        this.socket?.emit('unjail', 'card');
    }

    async rollForJail(): Promise<boolean> {
        return new Promise((resolve) => {
            this.socket?.emit('unjail', 'roll');
            this.socket?.on('jail_roll_result', (escaped: boolean) => {
                resolve(escaped);
            });
        });
    }

    async proposeTrade(toPlayerId: string, offer: TradeOffer): Promise<void> {
        this.socket?.emit('trade_propose', { toPlayerId, offer });
    }

    async acceptTrade(tradeId: string): Promise<void> {
        this.socket?.emit('trade_accept', { tradeId });
    }

    async rejectTrade(tradeId: string): Promise<void> {
        this.socket?.emit('trade_reject', { tradeId });
    }

    async sendMessage(message: string): Promise<void> {
        this.socket?.emit('chat', { message });
    }

    onGameEvent(callback: (event: GameEvent) => void): () => void {
        this.eventCallbacks.push(callback);
        return () => {
            this.eventCallbacks = this.eventCallbacks.filter(cb => cb !== callback);
        };
    }

    onPlayerUpdate(callback: (players: PlayerData[]) => void): () => void {
        this.playerCallbacks.push(callback);
        return () => {
            this.playerCallbacks = this.playerCallbacks.filter(cb => cb !== callback);
        };
    }

    onChatMessage(callback: (message: ChatMessage) => void): () => void {
        this.chatCallbacks.push(callback);
        return () => {
            this.chatCallbacks = this.chatCallbacks.filter(cb => cb !== callback);
        };
    }

    onDisconnect(callback: () => void): () => void {
        this.disconnectCallbacks.push(callback);
        return () => {
            this.disconnectCallbacks = this.disconnectCallbacks.filter(cb => cb !== callback);
        };
    }

    getCurrentRoom(): GameRoom | null {
        return this.currentRoom;
    }

    getCurrentPlayer(): PlayerData | null {
        if (!this.currentRoom) return null;
        return this.currentRoom.players.find(p => p.id === this.playerId) || null;
    }

    getPlayerId(): string {
        return this.playerId;
    }

    getServer(): Server | null {
        return this.server;
    }

    getSocket(): Socket | null {
        return this.socket;
    }

    // Private methods
    private setupSocketHandlers(): void {
        if (!this.socket) return;

        this.socket.on('players_update', (players: PlayerData[]) => {
            if (this.currentRoom) {
                this.currentRoom.players = players;
            }
            this.playerCallbacks.forEach(cb => cb(players));
        });

        this.socket.on('game_event', (event: GameEvent) => {
            this.eventCallbacks.forEach(cb => cb(event));
        });

        this.socket.on('chat_message', (message: ChatMessage) => {
            this.chatCallbacks.forEach(cb => cb(message));
        });

        this.socket.on('disconnect', () => {
            this.disconnectCallbacks.forEach(cb => cb());
        });
    }
}
