// html2canvas.js

// Import HTML2Canvas from CDN in your HTML:
// <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>

export class ReceiptCapture {
    constructor() {
        this.initializeShareButtons();
        this.initializePopup();
    }

    initializeShareButtons() {
        // Share button
        const shareButton = document.getElementById('share');
        const sharePopup = document.getElementById('share-popup');
        const closeSharePopup = document.getElementById('close-share-popup');
        
        if (shareButton) {
            shareButton.addEventListener('click', () => {
                sharePopup.classList.remove('hidden');
                document.querySelector('main').classList.add('popup-active'); // Tambah class
              });
        }

        if (closeSharePopup) {
            closeSharePopup.addEventListener('click', () => {
                sharePopup.classList.add('hidden');
                document.querySelector('main').classList.remove('popup-active'); // Hapus class
              });
        }

        // Download button
        const downloadButton = document.getElementById('download-receipt');
        if (downloadButton) {
            downloadButton.addEventListener('click', () => this.downloadReceipt());
        }

        // Instagram share button
        const instagramButton = document.getElementById('share-instagram');
        if (instagramButton) {
            instagramButton.addEventListener('click', () => this.shareToInstagram());
        }

        // WhatsApp share button
        const whatsappButton = document.getElementById('share-whatsapp');
        if (whatsappButton) {
            whatsappButton.addEventListener('click', () => this.shareToWhatsApp());
        }
    }

    initializePopup() {
        // Close popup when clicking outside
        const sharePopup = document.getElementById('share-popup');
        if (sharePopup) {
            sharePopup.addEventListener('click', (e) => {
                if (e.target === sharePopup) {
                    sharePopup.classList.add('hidden');
                }
            });
        }
    }

    async captureReceipt() {
        try {
            const receiptElement = document.querySelector('.app-section .receipt-card');
            if (!receiptElement) {
                throw new Error('Receipt element not found');
            }
            await new Promise(resolve => setTimeout(resolve, 1000)); // Tunggu 500ms
            // Add temporary class for capture
            receiptElement.classList.add('capturing');

            const canvas = await html2canvas(receiptElement, {
                scale: 1, // Turunkan skala jika perlu
                backgroundColor: null, // Biarkan transparan
                useCORS: true,       // Aktifkan CORS
                logging: true,       // Aktifkan logging untuk debug
                ignoreElements: (element) => element.classList.contains('hidden') // Abaikan elemen tersembunyi
              });

            // Remove temporary class
            receiptElement.classList.remove('capturing');

            return canvas;
        } catch (error) {
            console.error('Error capturing receipt:', error);
            throw error;
        }
    }

    async downloadReceipt() {
        try {
            const canvas = await this.captureReceipt();
            const link = document.createElement('a');
            link.download = `notetify-receipt-${new Date().getTime()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error('Error downloading receipt:', error);
            this.showError('Failed to download receipt');
        }
    }

    async shareToInstagram() {
        try {
            const canvas = await this.captureReceipt();
            const imageUrl = canvas.toDataURL('image/png');
            
            // Since Instagram doesn't have a direct web share API,
            // we'll provide instructions to save and share
            alert('Image has been captured! Please save the image and share it to Instagram manually.');
            
            // Automatically trigger download
            const link = document.createElement('a');
            link.download = `notetify-for-instagram-${new Date().getTime()}.png`;
            link.href = imageUrl;
            link.click();
        } catch (error) {
            console.error('Error preparing Instagram share:', error);
            this.showError('Failed to prepare image for Instagram');
        }
    }

    async shareToWhatsApp() {
        try {
            const canvas = await this.captureReceipt();
            const imageUrl = canvas.toDataURL('image/png');
            
            // Create a blob from the canvas data
            const blob = await (await fetch(imageUrl)).blob();
            
            // Check if Web Share API is available
            if (navigator.share) {
                await navigator.share({
                    files: [new File([blob], 'notetify-receipt.png', { type: 'image/png' })],
                    title: 'My Notetify Receipt',
                    text: 'Check out my music taste!'
                });
            } else {
                // Fallback to WhatsApp Web
                const whatsappUrl = `https://wa.me/?text=Check out my music taste on Notetify!`;
                window.open(whatsappUrl, '_blank');
                
                // Also download the image since we can't directly share it
                const link = document.createElement('a');
                link.download = `notetify-for-whatsapp-${new Date().getTime()}.png`;
                link.href = imageUrl;
                link.click();
            }
        } catch (error) {
            console.error('Error sharing to WhatsApp:', error);
            this.showError('Failed to share to WhatsApp');
        }
    }

    showError(message) {
        const errorElement = document.getElementById('error-message');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.remove('hidden');
            setTimeout(() => errorElement.classList.add('hidden'), 5000);
        }
    }
}

// Initialize the receipt capture functionality
document.addEventListener('DOMContentLoaded', () => {
    new ReceiptCapture();
});