import { UICoreMixin } from './pl-ui-core.js?v=288';
import { UIStepsMixin } from './pl-ui-steps.js?v=288';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=288';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=288';
import { UIMediaMixin } from './pl-ui-media.js?v=288';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
