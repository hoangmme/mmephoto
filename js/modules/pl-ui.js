import { UICoreMixin } from './pl-ui-core.js?v=251';
import { UIStepsMixin } from './pl-ui-steps.js?v=251';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=251';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=251';
import { UIMediaMixin } from './pl-ui-media.js?v=251';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
