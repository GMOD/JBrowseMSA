# useWheelScroll's shared rAF flag

**Closed: benign, not worth a change.**

`useWheelScroll.ts` uses one `scheduled` ref for both the wheel handler and the
drag-mousemove handler, so a wheel event and a drag can contend for the same
frame. A trackpad user can wheel mid-drag, so the two handlers do overlap.

The contended case loses no input. `globalMouseMove` only updates
`prevX`/`prevY` inside the rAF callback it skipped, so a dropped frame leaves
the drag origin where it was and the next mousemove computes the full
accumulated delta from it. The cost is at most one frame of latency on a gesture
nobody performs deliberately.

Separate flags would take two lines, but those lines would guard behavior no
user can observe. Reopen only if someone reports a real dropped drag.
