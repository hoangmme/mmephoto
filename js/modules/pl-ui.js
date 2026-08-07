import { UICoreMixin } from './pl-ui-core.js?v=276';
import { UIStepsMixin } from './pl-ui-steps.js?v=276';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=276';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=276';
import { UIMediaMixin } from './pl-ui-media.js?v=276';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
