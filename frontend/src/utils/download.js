export function downloadImageFile(downloadUrl, filename, onFeedback) {
  if (!downloadUrl) {
    if (onFeedback) onFeedback('Download URL unavailable for this visual.', 'error');
    return;
  }
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename || 'sustainability_campaign.png';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  if (onFeedback) onFeedback('Downloading high-resolution PNG...', 'info');
}
