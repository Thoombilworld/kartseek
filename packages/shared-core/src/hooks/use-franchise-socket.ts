'use client';

import { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket, disconnectSocket } from '../socket/socket';

export interface FranchiseSellerStatusEvent {
  franchiseId: string;
  sellerId: string;
  status: string;
  timestamp: string;
}

export function useFranchiseSocket(franchiseId: string | null) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!franchiseId) return;

    const socket = getSocket('franchise', { userId: franchiseId });
    socketRef.current = socket;

    socket.emit('join_franchise_room', { franchiseId });

    return () => {
      // Disconnect handled centrally if needed, or component unmounts
      // disconnectSocket('franchise');
    };
  }, [franchiseId]);

  return socketRef.current;
}

export function useFranchiseMarketplaceEvents(
  franchiseId: string | null,
  onStatusChanged: (data: FranchiseSellerStatusEvent) => void
) {
  const socket = useFranchiseSocket(franchiseId);

  useEffect(() => {
    if (!socket) return;

    socket.on('seller_status_changed', onStatusChanged);

    return () => {
      socket.off('seller_status_changed', onStatusChanged);
    };
  }, [socket, onStatusChanged]);
}
