let isHidden = document.visibilityState !== 'visible';

document.addEventListener('visibilitychange', () => {
  isHidden = document.visibilityState !== 'visible';
});

export function runNearFramePaint(callback) {
  if (isHidden) {
    return;
  }

  requestAnimationFrame(callback);
}
