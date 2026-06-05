export type SeatStatus = 'available' | 'sold' | 'blocked';

export interface Seat {
  /** Unique within a hall, e.g. "G8". */
  id: string;
  rowLabel: string;
  /** Number printed on the seat. */
  num: number;
  /** Row index, 0 = the row nearest the screen. */
  row: number;
  /** Grid column, 0 = far left when facing the screen. Aisles are empty columns. */
  col: number;
  category: string;
  price: number;
  status: SeatStatus;
}

export interface SeatCategory {
  id: string;
  name: string;
  price: number;
}

export interface SeatLayout {
  /** Number of grid columns, including aisle gaps. */
  cols: number;
  /** rows[0] is the row nearest the screen. A null cell is an aisle or gap. */
  rows: { label: string; cells: (Seat | null)[] }[];
  categories: SeatCategory[];
}

/**
 * Physical assumptions used to rebuild a hall from its seat grid.
 * Booking platforms publish the grid but not the dimensions, so these default
 * to typical multiplex values. An exhibitor can override any of them with
 * real measurements, which turns the estimate into a measured model.
 */
export interface HallSpec {
  /** Centre-to-centre seat spacing, metres. */
  seatPitch: number;
  /** Front-to-back spacing between rows, metres. */
  rowDepth: number;
  /** Height gained per row, metres. */
  rake: number;
  /** Screen width as a fraction of the seating width. Ignored when screenWidth is set. */
  screenWidthRatio: number;
  /** Screen aspect ratio (width / height). */
  screenAspect: number;
  /** Front row distance as a fraction of screen width. Ignored when frontRowDistance is set. */
  frontRowRatio: number;
  /** Seated eye height above the row's floor, metres. */
  eyeHeight: number;
  /** Height of the screen's bottom edge above the front row floor, metres. */
  screenBottom: number;
  /** Measured overrides, metres. */
  screenWidth?: number;
  frontRowDistance?: number;
  /** True when the spec comes from real measurements rather than defaults. */
  measured?: boolean;
}

export interface SeatPosition {
  /** Metres right of the screen centre line (negative = left), facing the screen. */
  x: number;
  /** Floor height of the seat's row, metres. */
  floorY: number;
  /** Eye height, metres. */
  eyeY: number;
  /** Horizontal distance from the screen plane, metres. */
  z: number;
}

export interface HallGeometry {
  spec: HallSpec;
  seatingWidth: number;
  screenWidth: number;
  screenHeight: number;
  /** Height of the screen centre above the front row floor. */
  screenCentreY: number;
  frontRowDistance: number;
  depth: number;
  positions: Record<string, SeatPosition>;
}

export interface SeatScore {
  /** 0–100. */
  score: number;
  /** Horizontal angle the screen fills, degrees. */
  fillAngle: number;
  /** Angle off the screen's centre line, degrees. */
  centreAngle: number;
  /** Upward tilt to the screen centre, degrees. Negative = looking slightly down. */
  neckAngle: number;
  /** Straight-line distance from eye to screen centre, metres. */
  distance: number;
  parts: { fill: number; centre: number; neck: number };
  verdict: 'Excellent view' | 'Good view' | 'Fair view' | 'Compromised view';
  reason: string;
}

export interface BlockFilters {
  /** Every seat must sit within the centre limit. */
  centreOnly?: boolean;
  /** Skip seats where the screen overflows the view. */
  notTooClose?: boolean;
  /** Per-ticket price cap. */
  maxPrice?: number;
}

export interface SeatBlock {
  seatIds: string[];
  rowLabel: string;
  category: string;
  pricePerSeat: number;
  /** Average score across the block. */
  avg: number;
  /** Score of the weakest seat. */
  min: number;
}
