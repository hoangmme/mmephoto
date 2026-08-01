import { UICoreMixin } from './pl-ui-core.js?v=254';
import { UIStepsMixin } from './pl-ui-steps.js?v=254';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=254';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=254';
import { UIMediaMixin } from './pl-ui-media.js?v=254';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
