import { UICoreMixin } from './pl-ui-core.js?v=298';
import { UIStepsMixin } from './pl-ui-steps.js?v=298';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=298';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=298';
import { UIMediaMixin } from './pl-ui-media.js?v=298';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
