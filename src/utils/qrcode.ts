import QRCode from 'qrcode';

export async function generateQRCode(text: string): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(text, {
      color: {
        dark: '#6F4E37', // Brown
        light: '#FFF8E7' // Cream
      },
      width: 250,
      margin: 2
    });
    return dataUrl;
  } catch (err) {
    console.error('Error generating QR code:', err);
    return '';
  }
}
