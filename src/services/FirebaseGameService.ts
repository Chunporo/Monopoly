/**
 * Firebase Game Service Implementation
 * Uses Firebase Realtime Database for game state synchronization
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import {
    getDatabase,
    ref,
    set,
    get,
    update,
    remove,
    onValue,
    onDisconnect,
    push,
    serverTimestamp,
    Database,
    DatabaseReference,
    Unsubscribe
} from 'firebase/database';
import {
    IGameService,
    GameRoom,
    PlayerData,
    GameState,
    GameEvent,
    GameEventType,
    ChatMessage,
    TradeOffer,
    PropertyData
} from './GameService';

// Firebase configuration - Replace with your own
import { firebaseConfig } from './firebaseConfig';


export class FirebaseGameService implements IGameService {
    private app: FirebaseApp | null = null;
    private db: Database | null = null;
    private playerId: string = '';
    private currentRoom: GameRoom | null = null;
    private roomRef: DatabaseReference | null = null;
    private unsubscribers: Unsubscribe[] = [];
    private eventCallbacks: ((event: GameEvent) => void)[] = [];
    private playerCallbacks: ((players: PlayerData[]) => void)[] = [];
    private chatCallbacks: ((message: ChatMessage) => void)[] = [];
    private disconnectCallbacks: (() => void)[] = [];
    private connected: boolean = false;

    async connect(): Promise<void> {
        if (this.connected) return;
        
        console.log('Connecting to Firebase...');
        try {
            this.app = initializeApp(firebaseConfig);
            this.db = getDatabase(this.app);
            this.playerId = this.generatePlayerId();
            this.connected = true;
            console.log('Connected to Firebase. Player ID:', this.playerId);
        } catch (error) {
            console.error('Firebase connection error:', error);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        // Unsubscribe from all listeners
        this.unsubscribers.forEach(unsub => unsub());
        this.unsubscribers = [];
        
        // Leave current room if in one
        if (this.currentRoom) {
            await this.leaveRoom();
        }
        
        this.connected = false;
    }

    isConnected(): boolean {
        return this.connected;
    }

    async createRoom(hostName: string, hostIcon: number, maxPlayers: number): Promise<GameRoom> {
        if (!this.db) throw new Error('Not connected');

        console.log('Creating room...');
        const roomCode = this.generateRoomCode();
        const roomId = roomCode;
        
        const hostPlayer: PlayerData = {
            id: this.playerId,
            username: hostName,
            icon: hostIcon,
            position: 0,
            balance: 1500,
            properties: [],
            isInJail: false,
            jailTurnsRemaining: 0,
            getoutCards: 0,
            isReady: false,
            isConnected: true
        };

        const initialGameState: GameState = {
            currentPlayerId: '',
            turnNumber: 0,
            diceRolls: null,
            lastAction: '',
            history: []
        };

        const room: GameRoom = {
            id: roomId,
            code: roomCode,
            hostId: this.playerId,
            players: [hostPlayer],
            gameState: initialGameState,
            maxPlayers: Math.min(maxPlayers, 6),
            createdAt: Date.now(),
            status: 'waiting'
        };

        // Save room to Firebase
        this.roomRef = ref(this.db, `rooms/${roomId}`);
        try {
            await set(this.roomRef, room);
            console.log('Room created successfully:', roomId);
        } catch (error) {
            console.error('Error creating room in Firebase:', error);
            throw error;
        }

        // Set up disconnect handler
        const playerRef = ref(this.db, `rooms/${roomId}/players/${this.playerId}`);
        onDisconnect(playerRef).update({ isConnected: false });

        this.currentRoom = room;
        this.setupRoomListeners(roomId);

        return room;
    }

    async joinRoom(roomCode: string, playerName: string, playerIcon: number): Promise<GameRoom> {
        if (!this.db) throw new Error('Not connected');

        const roomRef = ref(this.db, `rooms/${roomCode}`);
        const snapshot = await get(roomRef);

        if (!snapshot.exists()) {
            throw new Error('Room not found');
        }

        const room = snapshot.val() as GameRoom;

        if (room.status !== 'waiting') {
            throw new Error('Game has already started');
        }

        if (room.players.length >= room.maxPlayers) {
            throw new Error('Room is full');
        }

        const newPlayer: PlayerData = {
            id: this.playerId,
            username: playerName,
            icon: playerIcon,
            position: 0,
            balance: 1500,
            properties: [],
            isInJail: false,
            jailTurnsRemaining: 0,
            getoutCards: 0,
            isReady: false,
            isConnected: true
        };

        // Add player to room
        room.players.push(newPlayer);
        await update(roomRef, { players: room.players });

        // Set up disconnect handler
        const playerRef = ref(this.db, `rooms/${roomCode}/players/${this.playerId}`);
        onDisconnect(playerRef).update({ isConnected: false });

        this.roomRef = roomRef;
        this.currentRoom = room;
        this.setupRoomListeners(roomCode);

        // Emit player joined event
        await this.emitGameEvent('player_joined', { player: newPlayer });

        return room;
    }

    async leaveRoom(): Promise<void> {
        if (!this.db || !this.currentRoom) return;

        const roomId = this.currentRoom.id;
        const roomRef = ref(this.db, `rooms/${roomId}`);

        // Remove player from room
        const updatedPlayers = this.currentRoom.players.filter(p => p.id !== this.playerId);

        if (updatedPlayers.length === 0) {
            // Delete room if no players left
            await remove(roomRef);
        } else {
            // Update players list
            await update(roomRef, { players: updatedPlayers });

            // If host left, assign new host
            if (this.currentRoom.hostId === this.playerId) {
                await update(roomRef, { hostId: updatedPlayers[0].id });
            }
        }

        await this.emitGameEvent('player_left', { playerId: this.playerId });

        // Cleanup
        this.unsubscribers.forEach(unsub => unsub());
        this.unsubscribers = [];
        this.currentRoom = null;
        this.roomRef = null;
    }

    async setReady(ready: boolean): Promise<void> {
        if (!this.db || !this.currentRoom) throw new Error('Not in a room');

        const playerIndex = this.currentRoom.players.findIndex(p => p.id === this.playerId);
        if (playerIndex === -1) throw new Error('Player not found');

        const playerRef = ref(this.db, `rooms/${this.currentRoom.id}/players/${playerIndex}/isReady`);
        await set(playerRef, ready);

        await this.emitGameEvent('player_ready', { playerId: this.playerId, ready });
    }

    async startGame(): Promise<void> {
        if (!this.db || !this.currentRoom) throw new Error('Not in a room');
        if (this.currentRoom.hostId !== this.playerId) throw new Error('Only host can start the game');

        // Check if all players are ready
        const allReady = this.currentRoom.players.every(p => p.isReady || p.id === this.playerId);
        if (!allReady) throw new Error('Not all players are ready');

        // Randomize player order
        const shuffledPlayers = [...this.currentRoom.players].sort(() => Math.random() - 0.5);
        
        const gameState: GameState = {
            currentPlayerId: shuffledPlayers[0].id,
            turnNumber: 1,
            diceRolls: null,
            lastAction: 'Game started',
            history: []
        };

        await update(ref(this.db, `rooms/${this.currentRoom.id}`), {
            status: 'playing',
            players: shuffledPlayers,
            gameState
        });

        await this.emitGameEvent('game_started', { firstPlayer: shuffledPlayers[0].id });
    }

    async rollDice(): Promise<[number, number]> {
        if (!this.db || !this.currentRoom) throw new Error('Not in a room');
        if (this.currentRoom.gameState.currentPlayerId !== this.playerId) {
            throw new Error('Not your turn');
        }

        const dice1 = Math.floor(Math.random() * 6) + 1;
        const dice2 = Math.floor(Math.random() * 6) + 1;
        const rolls: [number, number] = [dice1, dice2];

        await update(ref(this.db, `rooms/${this.currentRoom.id}/gameState`), {
            diceRolls: rolls,
            lastAction: `Rolled ${dice1} + ${dice2} = ${dice1 + dice2}`
        });

        await this.emitGameEvent('dice_rolled', { playerId: this.playerId, rolls });

        return rolls;
    }

    async buyProperty(position: number): Promise<void> {
        if (!this.db || !this.currentRoom) throw new Error('Not in a room');

        const playerIndex = this.currentRoom.players.findIndex(p => p.id === this.playerId);
        if (playerIndex === -1) throw new Error('Player not found');

        const player = this.currentRoom.players[playerIndex];
        const newProperty: PropertyData = { posistion: position, count: 0 };
        
        const updatedProperties = [...player.properties, newProperty];
        
        await update(ref(this.db, `rooms/${this.currentRoom.id}/players/${playerIndex}`), {
            properties: updatedProperties
        });

        await this.emitGameEvent('property_bought', { playerId: this.playerId, position });
    }

    async buyBackProperty(position: number, fromPlayerId: string, price: number): Promise<void> {
        if (!this.db || !this.currentRoom) throw new Error('Not in a room');

        const buyerIndex = this.currentRoom.players.findIndex(p => p.id === this.playerId);
        const sellerIndex = this.currentRoom.players.findIndex(p => p.id === fromPlayerId);

        if (buyerIndex === -1 || sellerIndex === -1) throw new Error('Player not found');

        const buyer = this.currentRoom.players[buyerIndex];
        const seller = this.currentRoom.players[sellerIndex];

        // Find property in seller's properties
        const propertyIndex = seller.properties.findIndex(p => p.posistion === position);
        if (propertyIndex === -1) throw new Error('Property not found');
        
        const property = seller.properties[propertyIndex];

        // Update balances
        await update(ref(this.db, `rooms/${this.currentRoom.id}/players/${buyerIndex}`), {
            balance: buyer.balance - price
        });
        await update(ref(this.db, `rooms/${this.currentRoom.id}/players/${sellerIndex}`), {
            balance: seller.balance + price
        });

        // Transfer property
        const sellerProperties = [...seller.properties];
        sellerProperties.splice(propertyIndex, 1);
        await update(ref(this.db, `rooms/${this.currentRoom.id}/players/${sellerIndex}`), {
            properties: sellerProperties
        });

        const buyerProperties = [...buyer.properties, property];
        await update(ref(this.db, `rooms/${this.currentRoom.id}/players/${buyerIndex}`), {
            properties: buyerProperties
        });

        await this.emitGameEvent('property_bought', { playerId: this.playerId, position });
    }

    async skipProperty(): Promise<void> {
        await this.emitGameEvent('state_updated', { action: 'property_skipped' });
    }

    async payRent(amount: number, toPlayerId: string): Promise<void> {
        if (!this.db || !this.currentRoom) throw new Error('Not in a room');

        const payerIndex = this.currentRoom.players.findIndex(p => p.id === this.playerId);
        if (payerIndex === -1) throw new Error('Player not found');
        const payer = this.currentRoom.players[payerIndex];

        await update(ref(this.db, `rooms/${this.currentRoom.id}/players/${payerIndex}`), {
            balance: payer.balance - amount
        });

        if (toPlayerId !== "bank") {
            const receiverIndex = this.currentRoom.players.findIndex(p => p.id === toPlayerId);
            if (receiverIndex !== -1) {
                const receiver = this.currentRoom.players[receiverIndex];
                await update(ref(this.db, `rooms/${this.currentRoom.id}/players/${receiverIndex}`), {
                    balance: receiver.balance + amount
                });
            }
        }

        await this.emitGameEvent('rent_paid', { 
            fromPlayerId: this.playerId, 
            toPlayerId, 
            amount 
        });
    }

    async movePlayer(position: number): Promise<void> {
        if (!this.db || !this.currentRoom) throw new Error('Not in a room');

        const playerIndex = this.currentRoom.players.findIndex(p => p.id === this.playerId);
        if (playerIndex === -1) throw new Error('Player not found');

        await update(ref(this.db, `rooms/${this.currentRoom.id}/players/${playerIndex}`), {
            position
        });

        await this.emitGameEvent('player_moved', { playerId: this.playerId, position });
    }

    async endTurn(): Promise<void> {
        if (!this.db || !this.currentRoom) throw new Error('Not in a room');

        const currentIndex = this.currentRoom.players.findIndex(
            p => p.id === this.currentRoom!.gameState.currentPlayerId
        );
        const nextIndex = (currentIndex + 1) % this.currentRoom.players.length;
        const nextPlayer = this.currentRoom.players[nextIndex];

        await update(ref(this.db, `rooms/${this.currentRoom.id}/gameState`), {
            currentPlayerId: nextPlayer.id,
            turnNumber: this.currentRoom.gameState.turnNumber + 1,
            diceRolls: null,
            lastAction: `Turn passed to ${nextPlayer.username}`
        });

        await this.emitGameEvent('turn_changed', { 
            previousPlayerId: this.playerId,
            currentPlayerId: nextPlayer.id 
        });
    }

    async startQuiz(): Promise<void> {
        if (!this.db || !this.currentRoom) throw new Error('Not in a room');
        await this.emitGameEvent('quiz_started', { playerId: this.playerId });
    }

    async endQuiz(success: boolean): Promise<void> {
        if (!this.db || !this.currentRoom) throw new Error('Not in a room');
        await this.emitGameEvent('quiz_ended', { playerId: this.playerId, success });
    }

    async payJailFee(): Promise<void> {
        if (!this.db || !this.currentRoom) throw new Error('Not in a room');

        const playerIndex = this.currentRoom.players.findIndex(p => p.id === this.playerId);
        if (playerIndex === -1) throw new Error('Player not found');

        const player = this.currentRoom.players[playerIndex];

        await update(ref(this.db, `rooms/${this.currentRoom.id}/players/${playerIndex}`), {
            balance: player.balance - 50,
            isInJail: false,
            jailTurnsRemaining: 0
        });
    }

    async useGetOutCard(): Promise<void> {
        if (!this.db || !this.currentRoom) throw new Error('Not in a room');

        const playerIndex = this.currentRoom.players.findIndex(p => p.id === this.playerId);
        if (playerIndex === -1) throw new Error('Player not found');

        const player = this.currentRoom.players[playerIndex];
        if (player.getoutCards <= 0) throw new Error('No get out of jail cards');

        await update(ref(this.db, `rooms/${this.currentRoom.id}/players/${playerIndex}`), {
            getoutCards: player.getoutCards - 1,
            isInJail: false,
            jailTurnsRemaining: 0
        });
    }

    async rollForJail(): Promise<boolean> {
        const [dice1, dice2] = await this.rollDice();
        const isDoubles = dice1 === dice2;

        if (isDoubles) {
            const playerIndex = this.currentRoom!.players.findIndex(p => p.id === this.playerId);
            await update(ref(this.db!, `rooms/${this.currentRoom!.id}/players/${playerIndex}`), {
                isInJail: false,
                jailTurnsRemaining: 0
            });
        }

        return isDoubles;
    }

    async proposeTrade(toPlayerId: string, offer: TradeOffer): Promise<void> {
        if (!this.db || !this.currentRoom) throw new Error('Not in a room');

        const tradeRef = push(ref(this.db, `rooms/${this.currentRoom.id}/trades`));
        await set(tradeRef, {
            id: tradeRef.key,
            fromPlayerId: this.playerId,
            toPlayerId,
            offer,
            status: 'pending',
            createdAt: Date.now()
        });
    }

    async acceptTrade(tradeId: string): Promise<void> {
        if (!this.db || !this.currentRoom) throw new Error('Not in a room');
        
        await update(ref(this.db, `rooms/${this.currentRoom.id}/trades/${tradeId}`), {
            status: 'accepted'
        });
        // TODO: Execute trade logic
    }

    async rejectTrade(tradeId: string): Promise<void> {
        if (!this.db || !this.currentRoom) throw new Error('Not in a room');
        
        await update(ref(this.db, `rooms/${this.currentRoom.id}/trades/${tradeId}`), {
            status: 'rejected'
        });
    }

    async sendMessage(message: string): Promise<void> {
        if (!this.db || !this.currentRoom) throw new Error('Not in a room');

        const player = this.currentRoom.players.find(p => p.id === this.playerId);
        if (!player) throw new Error('Player not found');

        const chatRef = push(ref(this.db, `rooms/${this.currentRoom.id}/chat`));
        const chatMessage: ChatMessage = {
            id: chatRef.key!,
            playerId: this.playerId,
            playerName: player.username,
            message,
            timestamp: Date.now()
        };

        await set(chatRef, chatMessage);
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
    private setupRoomListeners(roomId: string): void {
        if (!this.db) return;

        // Listen for room changes
        const roomRef = ref(this.db, `rooms/${roomId}`);
        const unsubRoom = onValue(roomRef, (snapshot) => {
            if (snapshot.exists()) {
                this.currentRoom = snapshot.val() as GameRoom;
                this.playerCallbacks.forEach(cb => cb(this.currentRoom!.players));
            } else {
                // Room was deleted
                this.disconnectCallbacks.forEach(cb => cb());
            }
        });
        this.unsubscribers.push(unsubRoom);

        // Listen for chat messages
        const chatRef = ref(this.db, `rooms/${roomId}/chat`);
        const unsubChat = onValue(chatRef, (snapshot) => {
            if (snapshot.exists()) {
                const messages = snapshot.val();
                const lastKey = Object.keys(messages).pop();
                if (lastKey) {
                    this.chatCallbacks.forEach(cb => cb(messages[lastKey]));
                }
            }
        });
        this.unsubscribers.push(unsubChat);

        // Listen for events
        const eventsRef = ref(this.db, `rooms/${roomId}/events`);
        const unsubEvents = onValue(eventsRef, (snapshot) => {
            if (snapshot.exists()) {
                const events = snapshot.val();
                const lastKey = Object.keys(events).pop();
                if (lastKey) {
                    this.eventCallbacks.forEach(cb => cb(events[lastKey]));
                }
            }
        });
        this.unsubscribers.push(unsubEvents);
    }

    private async emitGameEvent(type: GameEventType, data: any): Promise<void> {
        if (!this.db || !this.currentRoom) return;

        const eventRef = push(ref(this.db, `rooms/${this.currentRoom.id}/events`));
        const event: GameEvent = {
            type,
            data,
            timestamp: Date.now()
        };
        await set(eventRef, event);
    }

    private generatePlayerId(): string {
        return 'player_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    private generateRoomCode(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
}
