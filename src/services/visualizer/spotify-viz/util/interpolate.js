export default function interpolate (a, b) {
  return function (t) {
    return a * (1 - t) + b * t
  }
}