let isHidden: boolean = document.visibilityState !== 'visible';

document.addEventListener('visibilitychange', () => {
  isHidden = document.visibilityState !== 'visible';
});

export function runNearFramePaint(callback: () => void) {
  if (isHidden) {
    return;
  }

  requestAnimationFrame(callback);
}
