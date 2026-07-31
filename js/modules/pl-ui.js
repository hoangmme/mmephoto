import { UICoreMixin } from './pl-ui-core.js?v=225';
import { UIStepsMixin } from './pl-ui-steps.js?v=225';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=225';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=225';
import { UIMediaMixin } from './pl-ui-media.js?v=225';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
