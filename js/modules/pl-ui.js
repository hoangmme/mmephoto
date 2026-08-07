import { UICoreMixin } from './pl-ui-core.js?v=280';
import { UIStepsMixin } from './pl-ui-steps.js?v=280';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=280';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=280';
import { UIMediaMixin } from './pl-ui-media.js?v=280';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
