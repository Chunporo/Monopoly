/**
 * Game Context - React Context for Game Service
 * Provides game service access throughout the application
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
    IGameService, 
    GameRoom, 
    PlayerData, 
    GameEvent, 
    ChatMessage,
    BackendType,
    createGameService 
} from './GameService';

interface GameContextType {
    // Service
    service: IGameService | null;
    isConnected: boolean;
    isLoading: boolean;
    error: string | null;
    
    // Room state
    room: GameRoom | null;
    players: PlayerData[];
    currentPlayer: PlayerData | null;
    isMyTurn: boolean;
    
    // Actions
    connect: (backend: BackendType) => Promise<void>;
    disconnect: () => Promise<void>;
    createRoom: (name: string, icon: number, maxPlayers: number) => Promise<GameRoom>;
    joinRoom: (code: string, name: string, icon: number) => Promise<GameRoom>;
    leaveRoom: () => Promise<void>;
    
    // Chat
    messages: ChatMessage[];
    sendMessage: (message: string) => Promise<void>;
}

const GameContext = createContext<GameContextType | null>(null);

export function useGame(): GameContextType {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error('useGame must be used within a GameProvider');
    }
    return context;
}

interface GameProviderProps {
    children: ReactNode;
    defaultBackend?: BackendType;
}

export function GameProvider({ children, defaultBackend = 'peerjs' }: GameProviderProps) {
    const [service, setService] = useState<IGameService | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [room, setRoom] = useState<GameRoom | null>(null);
    const [players, setPlayers] = useState<PlayerData[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    // Computed values
    const currentPlayer = service ? service.getCurrentPlayer() : null;
    const isMyTurn = room?.gameState?.currentPlayerId === service?.getPlayerId();

    // Connect to backend
    const connect = async (backend: BackendType) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const newService = await createGameService(backend);
            await newService.connect();
            
            // Setup listeners
            newService.onPlayerUpdate((updatedPlayers) => {
                setPlayers(updatedPlayers);
            });
            
            newService.onChatMessage((message) => {
                setMessages(prev => [...prev, message]);
            });
            
            newService.onGameEvent((event) => {
                console.log('Game event:', event);
                // Handle specific events
                if (event.type === 'game_started' || event.type === 'state_updated') {
                    const currentRoom = newService.getCurrentRoom();
                    if (currentRoom) {
                        setRoom({ ...currentRoom });
                    }
                }
            });
            
            newService.onDisconnect(() => {
                setIsConnected(false);
                setRoom(null);
                setPlayers([]);
            });
            
            setService(newService);
            setIsConnected(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Connection failed');
        } finally {
            setIsLoading(false);
        }
    };

    // Disconnect
    const disconnect = async () => {
        if (service) {
            await service.disconnect();
            setService(null);
            setIsConnected(false);
            setRoom(null);
            setPlayers([]);
            setMessages([]);
        }
    };

    // Create room
    const createRoom = async (name: string, icon: number, maxPlayers: number): Promise<GameRoom> => {
        if (!service) throw new Error('Not connected');
        
        setIsLoading(true);
        try {
            const newRoom = await service.createRoom(name, icon, maxPlayers);
            setRoom(newRoom);
            setPlayers(newRoom.players);
            return newRoom;
        } finally {
            setIsLoading(false);
        }
    };

    // Join room
    const joinRoom = async (code: string, name: string, icon: number): Promise<GameRoom> => {
        if (!service) throw new Error('Not connected');
        
        setIsLoading(true);
        try {
            const joinedRoom = await service.joinRoom(code, name, icon);
            setRoom(joinedRoom);
            setPlayers(joinedRoom.players);
            return joinedRoom;
        } finally {
            setIsLoading(false);
        }
    };

    // Leave room
    const leaveRoom = async () => {
        if (service) {
            await service.leaveRoom();
            setRoom(null);
            setPlayers([]);
            setMessages([]);
        }
    };

    // Send message
    const sendMessage = async (message: string) => {
        if (service) {
            await service.sendMessage(message);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (service) {
                service.disconnect();
            }
        };
    }, [service]);

    const value: GameContextType = {
        service,
        isConnected,
        isLoading,
        error,
        room,
        players,
        currentPlayer,
        isMyTurn,
        connect,
        disconnect,
        createRoom,
        joinRoom,
        leaveRoom,
        messages,
        sendMessage
    };

    return (
        <GameContext.Provider value={value}>
            {children}
        </GameContext.Provider>
    );
}

export default GameContext;
