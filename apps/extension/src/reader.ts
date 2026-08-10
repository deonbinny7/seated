import { PANEL_READY, SOURCE, type RawSeat, type RawSeatMap, type ReaderMessage } from './protocol';

/**
 * Page-world script. BookMyShow draws its seat map on a canvas with the Konva
 * library, so there are no seat elements in the DOM to read. Konva keeps every
 * drawn seat as an object in memory, each carrying the seat's row, number,
 * price and status. This script reads those objects (what is already on the
 * user's screen) and hands a plain copy to the panel.
 *
 * It makes no network requests and changes nothing on the page.
 */

interface KonvaNode {
  attrs: Record<string, any>;
  find(selector: string | ((n: KonvaNode) => boolean)): KonvaNode[];
  findOne(selector: string): KonvaNode | undefined;
  getParent(): KonvaNode | null;
  getAbsolutePosition(): { x: number; y: number };
}

function readSeatMap(): RawSeatMap | null {
  const stages: KonvaNode[] | undefined = (window as any).Konva?.stages;
  if (!stages?.length) return null;

  const seats: RawSeat[] = [];
  const categories: RawSeatMap['categories'] = [];
  let screenY: number | null = null;

  for (const stage of stages) {
    for (const node of stage.find((n) => !!n.attrs?.seatObj)) {
      const seat = node.attrs.seatObj;
      const rect = node.findOne('Rect');
      if (!rect) continue;
      const at = rect.getAbsolutePosition();
      seats.push({
        row: String(seat.rowNumber ?? ''),
        num: String(seat.displaySeatNumber ?? seat.cinemaSeatNumber ?? ''),
        x: at.x,
        y: at.y,
        price: Number(seat.curPrice) || 0,
        area: String(seat.areaCode ?? ''),
        free: Number(seat.seatStatus) === 1,
      });
    }

    for (const text of stage.find('Text')) {
      if (text.getParent()?.attrs?.seatObj) continue;
      const value = String(text.attrs.text ?? '');
      const header = value.match(/₹\s*([\d,]+(?:\.\d+)?)\s+(.+)/);
      if (header) categories.push({ price: Number(header[1].replace(/,/g, '')), name: header[2].trim() });
      else if (/eyes this way|screen/i.test(value)) screenY = text.getAbsolutePosition().y;
    }
  }

  if (!seats.length) return null;
  const title = document.querySelector('h1')?.textContent?.trim() ?? '';
  return { title, seats, screenY, categories };
}

let lastSent = '';
function tick() {
  let map: RawSeatMap | null = null;
  try {
    map = readSeatMap();
  } catch {
    // The site changed its seat map internals; report "no map" rather than break the page.
  }
  const serialised = JSON.stringify(map);
  if (serialised === lastSent) return;
  lastSent = serialised;
  const message: ReaderMessage = { source: SOURCE, map };
  window.postMessage(message, window.location.origin);
}

// The panel loads after this script. When it says it is listening, send the current map again,
// otherwise a seat map that was already on screen would never reach it.
window.addEventListener('message', (e) => {
  if (e.source !== window || e.data?.source !== PANEL_READY) return;
  lastSent = '';
  tick();
});

// Seats sell while the page is open and the site is a single-page app, so keep watching.
setInterval(tick, 1500);
tick();
