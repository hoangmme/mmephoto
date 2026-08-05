import { UICoreMixin } from './pl-ui-core.js?v=263';
import { UIStepsMixin } from './pl-ui-steps.js?v=263';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=263';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=263';
import { UIMediaMixin } from './pl-ui-media.js?v=263';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
