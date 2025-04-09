// auth.js
// NOTE: Assumes Lucid library is available (e.g., via CDN or npm install + bundler)
// If using CDN, replace the import with how the library exposes itself globally.
import { Lucid, Blockfrost } from "https://unpkg.com/lucid-cardano@0.10.7/web/mod.js"; // Using unpkg CDN for example

const connectButton = document.getElementById('connect-wallet-btn');
// const guestLoginButton = document.getElementById('guest-login-btn'); // REMOVED guest button reference
const walletInfoDiv = document.getElementById('wallet-info');
const errorMessageDiv = document.getElementById('error-message');

// --- Configuration (Replace with your Blockfrost Project ID) ---
// IMPORTANT: Ideally, use Preprod for testing first.
const BLOCKFROST_PROJECT_ID = 'mainnetx7tuiQLrIVt9zC2Z2KT14AWjKqg3mBGu'; // Needs user's Blockfrost ID
const NETWORK = 'Mainnet'; // Or 'Preprod' for testing

// --- Helper Functions ---
function displayError(message) {
    console.error("Auth Error:", message);
    if (errorMessageDiv) {
        errorMessageDiv.textContent = `Error: ${message}`;
    }
    if (connectButton) {
        connectButton.disabled = false; // Re-enable button on error
        connectButton.textContent = 'Connect Cardano Wallet';
    }
}

function displayWalletInfo(address) {
    if (walletInfoDiv) {
        const truncatedAddress = `${address.substring(0, 10)}...${address.substring(address.length - 6)}`;
        walletInfoDiv.textContent = `Connected: ${truncatedAddress}`;
    }
     if (connectButton) {
        connectButton.textContent = 'Connected!';
        connectButton.disabled = true;
    }
    if (errorMessageDiv) {
        errorMessageDiv.textContent = ''; // Clear errors
    }
}

async function connectWallet() {
    if (!connectButton) return;
    connectButton.disabled = true;
    connectButton.textContent = 'Connecting...';
    if (errorMessageDiv) errorMessageDiv.textContent = ''; // Clear previous errors

    if (!BLOCKFROST_PROJECT_ID || BLOCKFROST_PROJECT_ID === 'YOUR_BLOCKFROST_PROJECT_ID') {
        displayError("Blockfrost Project ID is not configured in auth.js.");
        return;
    }

    try {
        const lucid = await Lucid.new(
            new Blockfrost("https://cardano-mainnet.blockfrost.io/api/v0", BLOCKFROST_PROJECT_ID),
            // Or: new Blockfrost("https://cardano-preprod.blockfrost.io/api/v0", BLOCKFROST_PROJECT_ID) for Preprod
            NETWORK
        );
        console.log("Lucid initialized for", NETWORK);

        // Detect available wallet extensions
        const availableWallets = window.cardano ? Object.keys(window.cardano).filter(key => key !== 'ccvault') : []; // Filter out ccvault if needed
        console.log("Available Cardano wallets:", availableWallets);

        if (availableWallets.length === 0) {
            displayError("No supported Cardano wallet extension found (e.g., Nami, Eternl, Flint). Please install one.");
            return;
        }

        // Attempt to connect to the first available wallet (or prompt user)
        // For simplicity, let's try Nami first if available, then others.
        let selectedWalletName = availableWallets.includes('nami') ? 'nami' : availableWallets[0];
        console.log(`Attempting to enable wallet: ${selectedWalletName}`);

        const walletApi = await window.cardano[selectedWalletName].enable();
        lucid.selectWallet(walletApi);
        console.log("Wallet API selected:", walletApi);

        const stakeAddress = await lucid.wallet.rewardAddress(); // Get the stake address (unique per account)
        const usedAddress = await lucid.wallet.address(); // Get a used address (can change)

        if (!stakeAddress) {
            displayError("Could not retrieve stake address from the wallet. Ensure your wallet is set up correctly.");
            return;
        }

        console.log("Wallet connected successfully!");
        console.log("Stake Address:", stakeAddress);
        console.log("Used Address:", usedAddress);

        // --- Store Stake Address and Redirect ---
        // Use stake address as the unique player ID
        localStorage.setItem('playerCardanoStakeAddress', stakeAddress);
        // Remove guest flag if it exists (though it shouldn't with guest login removed)
        localStorage.removeItem('isGuestSession');

        displayWalletInfo(stakeAddress); // Update UI

        // Redirect to the main game page after a short delay
        setTimeout(() => {
            window.location.href = 'index.html'; // Redirect to the main game
        }, 1500); // Wait 1.5 seconds

    } catch (error) {
        if (error.info && typeof error.info === 'string') { // Lucid often includes user-facing info
             displayError(error.info);
        } else if (error.message) {
             displayError(error.message);
        } else {
             displayError("An unknown error occurred during wallet connection.");
        }
    console.error("Full connection error:", error);
    }
}

// --- Guest Login Handler (REMOVED) ---

// --- Initialization ---
if (connectButton) {
    connectButton.addEventListener('click', connectWallet);
} else {
    console.error("Connect wallet button not found!");
}

// REMOVED Guest login button listener

// Optional: Check if already connected on page load (less common for login pages)
// (async () => {
//    // Logic to check if a wallet session persists and redirect if so
// })();
