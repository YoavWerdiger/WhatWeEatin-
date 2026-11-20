export interface StopSliderProps {
  /** Number of stops (≥ 2). */
  count: number;
  /** Current stop, 0-based. */
  index: number;
  onChange: (index: number) => void;
  accessibilityLabel?: string;
}
