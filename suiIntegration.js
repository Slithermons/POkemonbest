// Import necessary components from the SUI dApp Kit (assuming ES module support via CDN)
// If this fails, we might need to access them via a global variable like window.SuiDappKit
import { ConnectButton, SuiClientProvider, WalletProvider, createNetworkConfig } from 'https://unpkg.com/@mysten/dapp-kit@^0.13/dist/index.esm.js';
import { getFullnodeUrl } from 'https://unpkg.com/@mysten/sui.js@^0.51/client';
import { QueryClient, QueryClientProvider } from 'https://unpkg.com/@tanstack/react-query@^5/build/modern/index.js'; // dApp kit uses react-query
import { h, render } from 'https://unpkg.com/preact@^10/dist/preact.module.js'; // dApp kit uses Preact for UI components
import { useEffect, useState } from 'https://unpkg.com/preact@^10/hooks/dist/hooks.module.js';

// --- Configuration ---
// Setup network configuration (e.g., mainnet, testnet, devnet)
// You might want to make this configurable later
const { networkConfig } = createNetworkConfig({
    // testnet: { url: getFullnodeUrl('testnet') },
    mainnet: { url: getFullnodeUrl('mainnet') },
    // devnet: { url: getFullnodeUrl('devnet') },
});
const queryClient = new QueryClient();

// --- Global State (Simple Example) ---
// We need a way to share the connection status and address with other game scripts
// A simple global object or custom events can work for vanilla JS projects.
window.suiWallet = {
    connected: false,
    address: null,
    network: null, // e.g., 'mainnet', 'testnet'
    // Add functions other scripts can call, e.g., to get NFTs
    getOwnedNfts: async () => {
        if (!window.suiWallet.connected || !window.suiWallet.address) {
            console.warn("SUI Wallet not connected.");
            return [];
        }
        // TODO: Implement NFT fetching logic using SUI SDK/API
        console.log("Fetching NFTs for address:", window.suiWallet.address);
        alert("NFT fetching not implemented yet."); // Placeholder
        return [];
    },
    // Add function for signing messages (useful for authentication)
    signPersonalMessage: async (message) => {
         if (!window.suiWallet.connected || !window.suiWallet.address) {
            console.warn("SUI Wallet not connected.");
            throw new Error("SUI Wallet not connected.");
        }
        // TODO: Implement message signing using the connected wallet adapter
        console.log("Requesting signature for message:", message);
        alert("Message signing not implemented yet."); // Placeholder
        // This part requires access to the wallet adapter instance provided by WalletProvider
        throw new Error("Message signing not implemented yet.");
    }
};

// --- React Component Wrapper ---
// dApp Kit components are built with React/Preact. We need a small wrapper.
function SuiIntegrationApp() {
    // Use hooks to react to connection changes
    // Note: This requires access to the WalletContext, which is tricky outside the provider.
    // We'll use the ConnectButton's built-in handling and potentially poll or use events.

    // Example of how to potentially get wallet status if hooks were easily available:
    // const { connectionStatus, currentWallet, address } = useWalletKit();
    // useEffect(() => {
    //     console.log("Wallet Connection Status:", connectionStatus);
    //     window.suiWallet.connected = connectionStatus === 'connected';
    //     window.suiWallet.address = address || null;
    //     // Dispatch a custom event to notify other parts of the game
    //     document.dispatchEvent(new CustomEvent('suiWalletChanged', { detail: window.suiWallet }));
    // }, [connectionStatus, address]);

    // The ConnectButton itself handles displaying connection state.
    // We might need a more robust way to track state globally.
    // For now, we rely on the button's visual state and potentially add
    // event listeners or polling if needed by gameWorld.js etc.

    return h(ConnectButton, {
        // Props for ConnectButton if needed
        connectText: 'Connect SUI Wallet',
        connectedText: 'Wallet Connected',
        onConnectSuccess: (wallet) => {
            console.log('SUI Wallet Connected:', wallet);
            window.suiWallet.connected = true;
            window.suiWallet.address = wallet.accounts[0]?.address || null; // Get address from connected wallet
            window.suiWallet.network = wallet.chains[0]?.split(':')[1] || null; // e.g., 'sui:mainnet' -> 'mainnet'
            console.log("Wallet Address:", window.suiWallet.address);
            console.log("Wallet Network:", window.suiWallet.network);
            // Dispatch a custom event
            document.dispatchEvent(new CustomEvent('suiWalletConnected', { detail: window.suiWallet }));
        },
        onDisconnectSuccess: () => {
            console.log('SUI Wallet Disconnected');
            window.suiWallet.connected = false;
            window.suiWallet.address = null;
            window.suiWallet.network = null;
            // Dispatch a custom event
            document.dispatchEvent(new CustomEvent('suiWalletDisconnected'));
        },
        onError: (error) => {
            console.error('SUI Wallet Connection Error:', error);
             window.suiWallet.connected = false;
            window.suiWallet.address = null;
            window.suiWallet.network = null;
             // Dispatch a custom event
            document.dispatchEvent(new CustomEvent('suiWalletError', { detail: error }));
        }
     });
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('sui-connect-container');
    if (!container) {
        console.error('SUI Connect container not found!');
        return;
    }

    // Render the Preact component into the container
    // We need to wrap our component with the necessary providers from dapp-kit
    render(
        h(QueryClientProvider, { client: queryClient },
            h(SuiClientProvider, { networks: networkConfig, defaultNetwork: 'mainnet' }, // Or 'testnet'/'devnet'
                h(WalletProvider, { autoConnect: true }, // Attempt auto-connect on load
                    h(SuiIntegrationApp, null)
                )
            )
        ),
        container
    );

    console.log("SUI Integration script loaded.");

    // Example: Listen for connection events (alternative to hooks)
    document.addEventListener('suiWalletConnected', (event) => {
        console.log('Caught suiWalletConnected event:', event.detail);
        // Update UI or game state elsewhere based on event.detail.address etc.
        // e.g., uiManager.updatePlayerIdentity(event.detail.address);
    });
     document.addEventListener('suiWalletDisconnected', () => {
        console.log('Caught suiWalletDisconnected event');
        // Update UI or game state elsewhere
        // e.g., uiManager.clearPlayerIdentity();
    });

});

// Export functions if needed (though using window.suiWallet might be simpler for vanilla JS interop)
// export const getSuiWallet = () => window.suiWallet;
