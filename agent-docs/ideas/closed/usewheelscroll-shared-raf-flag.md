# useWheelScroll's shared rAF flag

**Closed: benign, not worth a change.**

`useWheelScroll.ts` uses one `scheduled` ref for both the wheel handler and the
drag-mousemove handler, so a wheel event and a drag can contend for the same
frame. Wheeling mid-drag is possible on a trackpad, so "they never overlap" is
not quite the argument.

The argument that does hold is that the contended case loses nothing.
`globalMouseMove` only updates `prevX`/`prevY` inside the rAF callback it
skipped, so a dropped frame leaves the drag origin where it was and the next
mousemove computes the full accumulated delta from it. The cost is at most one
frame of latency on a gesture nobody performs deliberately.

Separate flags would be two lines, but they would also be two lines defending an
invariant no one can observe. Reopen only if a real dropped-drag report arrives.
