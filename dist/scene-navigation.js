import * as THREE from 'three';

// Selection is temporary; each workspace retains its own preselection view.
export function createSceneNavigation(host) {
  const selections = new Map();
  const fields = ['left', 'right', 'deep', 'tracts', 'opacity'];
  function rememberSelection() {
    if (!['atlas', 'dissection'].includes(host.state.mode) || selections.has(host.state.mode)) return;
    const transition = host.transition();
    selections.set(host.state.mode, {
      position: (transition?.to || host.camera.position).clone(),
      target: (transition?.target || host.controls.target).clone(),
      values: Object.fromEntries(fields.map(key => [key, host.state[key]])),
    });
  }
  function clearSelection({ restoreCamera = true } = {}) {
    const saved = selections.get(host.state.mode);
    selections.delete(host.state.mode);
    if (!host.state.selected && !saved) return false;
    host.stopConnections();
    host.cancelCamera();
    host.state.selected = null;
    if (saved) Object.assign(host.state, saved.values);
    host.repaint();
    if (restoreCamera) {
      if (saved) host.moveCamera(saved.position, saved.target);
      else host.setView('left');
    }
    return true;
  }
  function releaseMouse() {
    host.stopFly();
    host.cancelCamera();
    host.releaseFollow();
    host.controls.enabled = true;
    host.controls.autoRotate = false;
    // Consume residual damping before establishing the requested frame.
    const damping = host.controls.enableDamping;
    host.controls.enableDamping = false;
    host.controls.update();
    host.controls.enableDamping = damping;
    host.camera.up.set(0, 1, 0);
    host.camera.clearViewOffset();
    host.camera.updateProjectionMatrix();
  }
  function frame(position, target = new THREE.Vector3()) {
    const aspect = host.canvas.clientWidth / Math.max(1, host.canvas.clientHeight);
    const eye = position.clone().sub(target).multiplyScalar(Math.max(1, 1.15 / aspect)).add(target);
    host.moveCamera(eye, target);
  }
  function overview() {
    if (!host.ready() || host.state.mode === 'tests') return;
    releaseMouse();
    const mode = host.state.mode;
    if (mode === 'atlas') {
      clearSelection({ restoreCamera: false });
      host.resetAtlas();
      host.setView('left');
    } else if (['dissection', 'tours', 'quiz'].includes(mode)) {
      clearSelection({ restoreCamera: false });
      if(mode === 'dissection')host.foldBrain();
      host.setView('left');
    } else {
      const lab = host.lab();
      if (lab?.resetView) lab.resetView();
      else frame(new THREE.Vector3(-7, 3, 6));
    }
    host.syncControls();
    host.hideHover();
  }
  function clearCurrentSelection() {
    if (!host.ready()) return;
    releaseMouse();
    if (['atlas', 'dissection', 'tours', 'quiz'].includes(host.state.mode)) clearSelection();
    else host.lab()?.clearSelection?.();
    host.hideHover();
  }
  return { rememberSelection, clearSelection, clearCurrentSelection, releaseMouse, frame, overview };
}
