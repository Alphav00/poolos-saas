/**
 * Wizard step -> Svelte component binding.
 *
 * Kept separate from `steps.js` so the step logic can be unit-tested in
 * plain Node (no Svelte runtime required).
 */
import JobMetaForm from '../components/JobMetaForm.svelte';
import ABSetupForm from '../components/ABSetupForm.svelte';
import PerimeterCaptureForm from '../components/PerimeterCaptureForm.svelte';
import CrossDimensionsForm from '../components/CrossDimensionsForm.svelte';
import ObstaclesForm from '../components/ObstaclesForm.svelte';
import StepSpaForm from '../components/StepSpaForm.svelte';
import CoverSpecForm from '../components/CoverSpecForm.svelte';
import LinerShapeForm from '../components/LinerShapeForm.svelte';
import WallHeightsForm from '../components/WallHeightsForm.svelte';
import LinerProfileForm from '../components/LinerProfileForm.svelte';
import LinerStepsForm from '../components/LinerStepsForm.svelte';
import FittingsForm from '../components/FittingsForm.svelte';
import LinerSpecForm from '../components/LinerSpecForm.svelte';
import ReviewForm from '../components/ReviewForm.svelte';
import ComingSoon from './ComingSoon.svelte';

/**
 * Returns the Svelte component for a given step id.
 */
export function getStepComponent(stepId) {
  switch (stepId) {
    case 'meta':       return JobMetaForm;
    case 'ab-setup':   return ABSetupForm;
    case 'perimeter':  return PerimeterCaptureForm;
    case 'cross-dims': return CrossDimensionsForm;
    case 'obstacles':  return ObstaclesForm;
    case 'step-spa':   return StepSpaForm;
    case 'cover':      return CoverSpecForm;
    case 'liner-shape':   return LinerShapeForm;
    case 'wall-heights':  return WallHeightsForm;
    case 'liner-profile': return LinerProfileForm;
    case 'liner-steps':   return LinerStepsForm;
    case 'fittings':      return FittingsForm;
    case 'liner-spec':    return LinerSpecForm;
    case 'review':     return ReviewForm;
    default:           return ComingSoon;
  }
}

/** Extra props to pass to the component (besides `job` and `store`). */
export function getStepComponentProps(stepId) {
  switch (stepId) {
    case 'ab-setup':
      return {
        title: 'A-B Line Setup',
        description: 'Set A-B distance, offset from pool, and orientation. Visual sketch of the pool with the A-B line drawn on it.',
      };
    case 'perimeter':
      return {
        title: 'Perimeter Capture',
        description: 'Add numbered perimeter points with A and B tape distances. The mini-map updates live as you add points.',
      };
    case 'cross-dims':
      return {
        title: 'Cross-Dimensions',
        description: 'Measure 2-4 diagonal distances between numbered perimeter points. Each is auto-validated against the reconstructed length or width.',
      };
    case 'obstacles':
      return {
        title: 'Obstacles',
        description: 'Add each non-removable obstacle within 18in of the waterline: handrails, ladders, rocks, waterfalls, etc.',
      };
    case 'step-spa':
      return {
        title: 'Step & Spa',
        description: 'Step/swim-out and attached-spa spec. Both optional.',
      };
    case 'cover':
      return {
        title: 'Cover & Hardware',
        description: 'Cover type/color/spacing/anchor type/overlap + hardware add-ons.',
      };
    case 'liner-shape':
      return {
        title: 'Pool Shape',
        description: 'Pick the supplier form this pool is ordered on. Standard shapes go on a lettered form; organic shapes are ordered from the A/B plot itself.',
      };
    case 'wall-heights':
      return {
        title: 'Wall Heights',
        description: 'One reading per wall, from the bead receiver down to the top of the cove.',
      };
    case 'liner-profile':
      return {
        title: 'Floor Profile',
        description: 'The floor section from the shallow wall to the deep wall, plus the hopper cross-section. Both close live as you type.',
      };
    case 'liner-steps':
      return {
        title: 'Steps',
        description: 'Vinyl-over risers and treads. The riser stack is checked against the shallow wall height.',
      };
    case 'fittings':
      return {
        title: 'Fittings',
        description: 'Every cut-out the liner needs: skimmers, returns, lights, main drains.',
      };
    case 'liner-spec':
      return {
        title: 'Liner & Site',
        description: 'Pattern, gauge and bead for the shop; floor and drainage condition for drain day.',
      };
    case 'review':
      return {
        title: 'Review & Export',
        description: '3D preview, dimensions, and PDF download.',
      };
    default:
      return {};
  }
}
