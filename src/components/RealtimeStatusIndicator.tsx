/**
 * Real-Time Connection Status Indicator
 * Shows WebSocket connection status
 */

import { useWebSocketContext } from '@/context/WebSocketContext';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

export function RealtimeStatusIndicator() {
    const { isConnected, connectionStatus } = useWebSocketContext();

    const statusConfig = {
        connected: {
            icon: Wifi,
            text: 'Real-time updates active',
            variant: 'default' as const,
            className: 'bg-green-500 hover:bg-green-600',
        },
        connecting: {
            icon: Loader2,
            text: 'Connecting to real-time updates...',
            variant: 'secondary' as const,
            className: 'bg-yellow-500 hover:bg-yellow-600',
        },
        disconnected: {
            icon: WifiOff,
            text: 'Real-time updates offline',
            variant: 'outline' as const,
            className: 'bg-gray-500 hover:bg-gray-600',
        },
        error: {
            icon: WifiOff,
            text: 'Real-time connection error',
            variant: 'destructive' as const,
            className: '',
        },
    };

    const config = statusConfig[connectionStatus];
    const Icon = config.icon;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Badge variant={config.variant} className={`cursor-help ${config.className}`}>
                        <Icon className={`h-3 w-3 mr-1 ${connectionStatus === 'connecting' ? 'animate-spin' : ''}`} />
                        <span className="text-xs">
                            {isConnected ? 'Live' : connectionStatus === 'connecting' ? 'Connecting' : 'Offline'}
                        </span>
                    </Badge>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{config.text}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

export default RealtimeStatusIndicator;
