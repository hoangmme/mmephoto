import { UICoreMixin } from './pl-ui-core.js?v=226';
import { UIStepsMixin } from './pl-ui-steps.js?v=226';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=226';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=226';
import { UIMediaMixin } from './pl-ui-media.js?v=226';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
