/**
 * GameService - Abstract interface for game backend
 * This allows switching between different backends (Firebase, WebSocket, etc.)
 */

export interface GameRoom {
    id: string;
    code: string;
    hostId: string;
    players: PlayerData[];
    gameState: GameState;
    maxPlayers: number;
    createdAt: number;
    status: 'waiting' | 'playing' | 'finished';
}

export interface PlayerData {
    id: string;
    username: string;
    icon: number;
    position: number;
    balance: number;
    properties: PropertyData[];
    isInJail: boolean;
    jailTurnsRemaining: number;
    getoutCards: number;
    isReady: boolean;
    isConnected: boolean;
}

export interface PropertyData {
    posistion: number;
    count: 0 | 1 | 2 | 3 | 4 | 'h';
}

export interface GameState {
    currentPlayerId: string;
    turnNumber: number;
    diceRolls: [number, number] | null;
    lastAction: string;
    history: HistoryAction[];
}

export interface HistoryAction {
    playerId: string;
    action: string;
    timestamp: number;
    data?: any;
}

export interface ChatMessage {
    id: string;
    playerId: string;
    playerName: string;
    message: string;
    timestamp: number;
}

// Event types for real-time updates
export type GameEventType = 
    | 'player_joined'
    | 'player_left'
    | 'player_ready'
    | 'game_started'
    | 'turn_changed'
    | 'dice_rolled'
    | 'property_bought'
    | 'rent_paid'
    | 'player_moved'
    | 'chat_message'
    | 'game_ended'
    | 'state_updated'
    | 'quiz_started'
    | 'quiz_ended';

export interface GameEvent {
    type: GameEventType;
    data: any;
    timestamp: number;
}

/**
 * Abstract GameService interface
 * Implement this for different backends
 */
export interface IGameService {
    // Connection
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;

    // Room Management
    createRoom(hostName: string, hostIcon: number, maxPlayers: number): Promise<GameRoom>;
    joinRoom(roomCode: string, playerName: string, playerIcon: number): Promise<GameRoom>;
    leaveRoom(): Promise<void>;
    
    // Player Actions
    setReady(ready: boolean): Promise<void>;
    startGame(): Promise<void>;
    
    // Game Actions
    rollDice(): Promise<[number, number]>;
    buyProperty(position: number): Promise<void>;
    buyBackProperty(position: number, fromPlayerId: string, price: number): Promise<void>;
    skipProperty(): Promise<void>;
    payRent(amount: number, toPlayerId: string): Promise<void>;
    movePlayer(position: number): Promise<void>;
    endTurn(): Promise<void>;
    
    // Quiz Actions
    startQuiz(): Promise<void>;
    endQuiz(success: boolean): Promise<void>;
    
    // Jail Actions
    payJailFee(): Promise<void>;
    useGetOutCard(): Promise<void>;
    rollForJail(): Promise<boolean>;
    
    // Trading
    proposeTrade(toPlayerId: string, offer: TradeOffer): Promise<void>;
    acceptTrade(tradeId: string): Promise<void>;
    rejectTrade(tradeId: string): Promise<void>;
    
    // Chat
    sendMessage(message: string): Promise<void>;
    
    // Event Listeners
    onGameEvent(callback: (event: GameEvent) => void): () => void;
    onPlayerUpdate(callback: (players: PlayerData[]) => void): () => void;
    onChatMessage(callback: (message: ChatMessage) => void): () => void;
    onDisconnect(callback: () => void): () => void;
    
    // Getters
    getCurrentRoom(): GameRoom | null;
    getCurrentPlayer(): PlayerData | null;
    getPlayerId(): string;
}

export interface TradeOffer {
    money: number;
    properties: number[];
    requestMoney: number;
    requestProperties: number[];
}

// Factory function to get the appropriate service
export type BackendType = 'firebase' | 'websocket' | 'peerjs';

export async function createGameService(backend: BackendType): Promise<IGameService> {
    switch (backend) {
        case 'firebase':
            const { FirebaseGameService } = await import('./FirebaseGameService');
            return new FirebaseGameService();
        case 'websocket':
            const { WebSocketGameService } = await import('./WebSocketGameService');
            return new WebSocketGameService();
        case 'peerjs':
            const { PeerJSGameService } = await import('./PeerJSGameService');
            return new PeerJSGameService();
        default:
            throw new Error(`Unknown backend type: ${backend}`);
    }
}
