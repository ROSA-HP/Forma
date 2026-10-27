export interface IShareService {
  shareText(title: string, text: string): Promise<boolean>;
  downloadFile(filename: string, content: string, contentType: string): void;
  copyToClipboard(text: string): Promise<boolean>;
}

class UniversalShareService implements IShareService {
  async shareText(title: string, text: string): Promise<boolean> {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title, text });
        return true;
      } catch (err: any) {
        if (err.name === 'AbortError') return false;
      }
    }

    // Fallback to clipboard
    return this.copyToClipboard(text);
  }

  async copyToClipboard(text: string): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // fallback
      }
    }

    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }

  downloadFile(filename: string, content: string, contentType: string): void {
    if (typeof window === 'undefined') return;
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const ShareService: IShareService = new UniversalShareService();
