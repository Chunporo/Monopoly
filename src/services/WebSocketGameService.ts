/**
 * WebSocket Game Service Implementation
 * For self-hosted game servers
 */

import {
    IGameService,
    GameRoom,
    PlayerData,
    GameEvent,
    ChatMessage,
    TradeOffer
} from './GameService';

export class WebSocketGameService implements IGameService {
    private ws: WebSocket | null = null;
    private playerId: string = '';
    private currentRoom: GameRoom | null = null;
    private serverUrl: string = '';
    private connected: boolean = false;
    
    private eventCallbacks: ((event: GameEvent) => void)[] = [];
    private playerCallbacks: ((players: PlayerData[]) => void)[] = [];
    private chatCallbacks: ((message: ChatMessage) => void)[] = [];
    private disconnectCallbacks: (() => void)[] = [];
    private pendingRequests: Map<string, { resolve: Function; reject: Function }> = new Map();

    constructor(serverUrl?: string) {
        this.serverUrl = serverUrl || import.meta.env.VITE_WS_SERVER_URL || 'ws://localhost:3001';
    }

    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.serverUrl);
            
            this.ws.onopen = () => {
                this.connected = true;
                this.playerId = this.generatePlayerId();
                resolve();
            };

            this.ws.onerror = (error) => {
                reject(new Error('WebSocket connection failed'));
            };

            this.ws.onclose = () => {
                this.connected = false;
                this.disconnectCallbacks.forEach(cb => cb());
            };

            this.ws.onmessage = (event) => {
                this.handleMessage(JSON.parse(event.data));
            };
        });
    }

    async disconnect(): Promise<void> {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
    }

    isConnected(): boolean {
        return this.connected;
    }

    async createRoom(hostName: string, hostIcon: number, maxPlayers: number): Promise<GameRoom> {
        return this.sendRequest('createRoom', { hostName, hostIcon, maxPlayers });
    }

    async joinRoom(roomCode: string, playerName: string, playerIcon: number): Promise<GameRoom> {
        return this.sendRequest('joinRoom', { roomCode, playerName, playerIcon });
    }

    async leaveRoom(): Promise<void> {
        return this.sendRequest('leaveRoom', {});
    }

    async setReady(ready: boolean): Promise<void> {
        return this.sendRequest('setReady', { ready });
    }

    async startGame(): Promise<void> {
        return this.sendRequest('startGame', {});
    }

    async rollDice(): Promise<[number, number]> {
        return this.sendRequest('rollDice', {});
    }

    async buyProperty(position: number): Promise<void> {
        return this.sendRequest('buyProperty', { position });
    }

    async skipProperty(): Promise<void> {
        return this.sendRequest('skipProperty', {});
    }

    async payRent(amount: number, toPlayerId: string): Promise<void> {
        return this.sendRequest('payRent', { amount, toPlayerId });
    }

    async movePlayer(position: number): Promise<void> {
        return this.sendRequest('movePlayer', { position });
    }

    async endTurn(): Promise<void> {
        return this.sendRequest('endTurn', {});
    }

    async payJailFee(): Promise<void> {
        return this.sendRequest('payJailFee', {});
    }

    async useGetOutCard(): Promise<void> {
        return this.sendRequest('useGetOutCard', {});
    }

    async rollForJail(): Promise<boolean> {
        return this.sendRequest('rollForJail', {});
    }

    async proposeTrade(toPlayerId: string, offer: TradeOffer): Promise<void> {
        return this.sendRequest('proposeTrade', { toPlayerId, offer });
    }

    async acceptTrade(tradeId: string): Promise<void> {
        return this.sendRequest('acceptTrade', { tradeId });
    }

    async rejectTrade(tradeId: string): Promise<void> {
        return this.sendRequest('rejectTrade', { tradeId });
    }

    async sendMessage(message: string): Promise<void> {
        return this.sendRequest('sendMessage', { message });
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

    // Private methods
    private sendRequest<T>(action: string, data: any): Promise<T> {
        return new Promise((resolve, reject) => {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                reject(new Error('Not connected'));
                return;
            }

            const requestId = this.generateRequestId();
            this.pendingRequests.set(requestId, { resolve, reject });

            this.ws.send(JSON.stringify({
                type: 'request',
                requestId,
                action,
                playerId: this.playerId,
                data
            }));

            // Timeout after 10 seconds
            setTimeout(() => {
                if (this.pendingRequests.has(requestId)) {
                    this.pendingRequests.delete(requestId);
                    reject(new Error('Request timeout'));
                }
            }, 10000);
        });
    }

    private handleMessage(message: any): void {
        switch (message.type) {
            case 'response':
                const pending = this.pendingRequests.get(message.requestId);
                if (pending) {
                    this.pendingRequests.delete(message.requestId);
                    if (message.error) {
                        pending.reject(new Error(message.error));
                    } else {
                        pending.resolve(message.data);
                    }
                }
                break;

            case 'roomUpdate':
                this.currentRoom = message.room;
                this.playerCallbacks.forEach(cb => cb(message.room.players));
                break;

            case 'gameEvent':
                this.eventCallbacks.forEach(cb => cb(message.event));
                break;

            case 'chatMessage':
                this.chatCallbacks.forEach(cb => cb(message.message));
                break;

            case 'error':
                console.error('Server error:', message.error);
                break;
        }
    }

    private generatePlayerId(): string {
        return 'player_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    private generateRequestId(): string {
        return 'req_' + Math.random().toString(36).substr(2, 9);
    }
}
