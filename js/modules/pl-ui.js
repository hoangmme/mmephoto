import { UICoreMixin } from './pl-ui-core.js?v=266';
import { UIStepsMixin } from './pl-ui-steps.js?v=266';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=266';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=266';
import { UIMediaMixin } from './pl-ui-media.js?v=266';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
