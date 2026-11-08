export interface CameraView {
  position: ArrayLike<number>
  target: ArrayLike<number>
  up: ArrayLike<number>
  radius: number
}

export interface LinkedCamera<V extends CameraView = CameraView> {
  getSnapshot: () => V
  setState: (view: V, durationMs: number) => void
  stateChanged: { subscribe: (fn: () => void) => { unsubscribe: () => void } }
}

function near(x: ArrayLike<number>, y: ArrayLike<number>) {
  return [0, 1, 2].every(i => Math.abs((x[i] ?? 0) - (y[i] ?? 0)) < 1e-3)
}

function sameView(a: CameraView, b: CameraView) {
  return (
    near(a.position, b.position) &&
    near(a.target, b.target) &&
    near(a.up, b.up) &&
    Math.abs(a.radius - b.radius) < 1e-3
  )
}

/**
 * Ties cameras together by key, so turning one turns the rest. Setting a camera
 * makes it emit a change of its own, and that echo carries the view just passed
 * on, so it is recognized and dropped. Changes closer together than
 * `throttleMs` collapse into one, and the last of them is always passed on, so
 * the others stop where the turned camera stopped.
 */
export function cameraLink<V extends CameraView = CameraView>({
  throttleMs = 60,
} = {}) {
  const cameras = new Map<string, LinkedCamera<V>>()
  const subscriptions = new Map<string, () => void>()
  let passing = false
  let lastPassed = -Infinity
  let lastView: V | undefined
  let trailing: ReturnType<typeof setTimeout> | undefined

  function follow(source: string) {
    const from = cameras.get(source)
    if (!from || passing) {
      return
    }
    const view = from.getSnapshot()
    if (lastView && sameView(view, lastView)) {
      return
    }
    const wait = throttleMs - (Date.now() - lastPassed)
    if (wait > 0) {
      clearTimeout(trailing)
      trailing = setTimeout(() => {
        follow(source)
      }, wait)
      return
    }
    passing = true
    try {
      for (const [key, camera] of cameras) {
        if (key !== source && !sameView(camera.getSnapshot(), view)) {
          camera.setState(view, 0)
        }
      }
    } finally {
      passing = false
      lastPassed = Date.now()
      lastView = view
    }
  }

  function unregister(key: string) {
    subscriptions.get(key)?.()
    subscriptions.delete(key)
    cameras.delete(key)
  }

  return {
    has: (key: string) => cameras.has(key),
    follow,
    register(key: string, camera: LinkedCamera<V> | undefined) {
      unregister(key)
      if (!camera) {
        return
      }
      cameras.set(key, camera)
      // a newcomer has not seen the last view, so the next pass reaches it
      lastView = undefined
      const subscription = camera.stateChanged.subscribe(() => {
        follow(key)
      })
      subscriptions.set(key, () => {
        subscription.unsubscribe()
      })
    },
    dispose() {
      clearTimeout(trailing)
      for (const key of [...cameras.keys()]) {
        unregister(key)
      }
    },
  }
}
