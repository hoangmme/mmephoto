import { UICoreMixin } from './pl-ui-core.js?v=275';
import { UIStepsMixin } from './pl-ui-steps.js?v=275';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=275';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=275';
import { UIMediaMixin } from './pl-ui-media.js?v=275';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
