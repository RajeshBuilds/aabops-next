export interface ByteRange {
  start: number;
  end: number;
}

export function parseRangeHeader(
  rangeHeader: string | null,
  fileSize: number,
): ByteRange | null {
  if (!rangeHeader) return null;
  const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/i);
  if (!match) return null;

  const startRaw = match[1];
  const endRaw = match[2];

  let start: number;
  let end: number;

  if (startRaw === "" && endRaw === "") return null;
  if (startRaw === "") {
    const suffixLength = Number.parseInt(endRaw, 10);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return null;
    start = Math.max(fileSize - suffixLength, 0);
    end = fileSize - 1;
  } else {
    start = Number.parseInt(startRaw, 10);
    if (!Number.isFinite(start) || start < 0) return null;
    if (endRaw === "") {
      end = fileSize - 1;
    } else {
      end = Number.parseInt(endRaw, 10);
      if (!Number.isFinite(end) || end < start) return null;
    }
  }

  if (start >= fileSize) return null;
  end = Math.min(end, fileSize - 1);

  return { start, end };
}
