export class ReceiptCapture {
  constructor() {
    this.initializeShareButtons();
  }

  initializeShareButtons() {
    const shareButton = document.getElementById('share');
    if (shareButton) {
      shareButton.addEventListener('click', () => this.captureReceipt());
    }
  }

  async captureReceipt() {
    try {
      const receiptElement = document.querySelector('.receipt-card');
      if (!receiptElement) {
        throw new Error('Receipt element not found');
      }

      const canvas = await html2canvas(receiptElement);
      const imageUrl = canvas.toDataURL('image/png');

      // Download the image
      const link = document.createElement('a');
      link.download = 'receipt.png';
      link.href = imageUrl;
      link.click();
    } catch (error) {
      console.error('Error capturing receipt:', error);
    }
  }
}