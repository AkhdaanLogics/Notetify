// html2canvas.js
export class ReceiptCapture {
  constructor() {
    // Remove the initialization here as it's being called from script.js
  }

  async captureReceipt() {
    console.log('Attempting to capture receipt...');

    try {
      const receiptElement = document.querySelector('.receipt-content');
      if (!receiptElement) {
        throw new Error('Receipt element not found');
      }

      console.log('Receipt element found:', receiptElement);
      
      // Use the global html2canvas that was loaded via the CDN
      if (typeof html2canvas !== 'function') {
        throw new Error('html2canvas is not available');
      }
      
      const canvas = await html2canvas(receiptElement, {
        scrollX: 0,
        scrollY: 0,
        width: receiptElement.scrollWidth + 40, // Tambahkan margin ekstra
        height: receiptElement.scrollHeight + 40, // Tambahkan margin ekstra
        scale: 2, // Tingkatkan resolusi
        useCORS: true, // Jika menggunakan gambar eksternal
      });
      const imageUrl = canvas.toDataURL('image/png');
      console.log('Canvas width:', canvas.width);
      console.log('Canvas height:', canvas.height);
      console.log('Canvas created successfully');
      const link = document.createElement('a');
      link.download = 'notetify-receipt.png';
      link.href = imageUrl;
      link.click();
      

      return imageUrl; // Return the URL in case needed elsewhere
    } catch (error) {
      console.error('Error capturing receipt:', error);
      throw error;
    }
  }
}