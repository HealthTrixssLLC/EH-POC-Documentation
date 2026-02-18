export function getSupportedAudioMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/mp4;codecs=aac",
    "audio/ogg;codecs=opus",
    "audio/aac",
    "",
  ];
  for (const mime of candidates) {
    if (mime === "") return "";
    try {
      if (MediaRecorder.isTypeSupported(mime)) return mime;
    } catch {
      continue;
    }
  }
  return "";
}

export function getAudioBlobType(mimeType: string): string {
  if (mimeType.startsWith("audio/mp4")) return "audio/mp4";
  if (mimeType.startsWith("audio/ogg")) return "audio/ogg";
  if (mimeType.startsWith("audio/aac")) return "audio/aac";
  return "audio/webm";
}
